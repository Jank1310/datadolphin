import {
  ApplicationFailure,
  condition,
  defineQuery,
  defineSignal,
  defineUpdate,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import pLimit from "p-limit";
import { makeActivities } from "../activities";
import { ColumnConfig } from "../domain/ColumnConfig";
import { DataMappingRecommendation } from "../domain/DataAnalyzer";
import { DataMapping } from "../domain/DataMapping";
import { DataSetPatch } from "../domain/DataSet";
export interface ImporterWorkflowParams {
  name: string;
  description?: string;
  meta: Record<string, string>;
  columnConfig: ColumnConfig[];
  callbackUrl: string;
  /**
   * Timeout for upload of file.
   * If not set, defaults to 24 hours.
   */
  uploadTimeout?: string;
  /**
   * Timeout for the start of the import.
   * If not set, defaults to 24 hours.
   */
  startImportTimeout?: string;
  logo: string;
}

export interface ImporterStatus {
  isWaitingForFile: boolean;
  isWaitingForImport: boolean;
  isImporting: boolean;
  dataMappingRecommendations: DataMappingRecommendation[] | null;
}

export interface Mapping {
  targetColumn: string | null;
  sourceColumn: string;
}

const addFileUpdate = defineUpdate<
  void,
  [
    {
      fileReference: string;
      fileFormat: "csv" | "xlsx";
      bucket: string;
    }
  ]
>("importer:add-file");
const addPatchesSignal =
  defineSignal<[{ patches: DataSetPatch[] }]>("importer:add-patch");
const startImportSignal = defineSignal<[]>("importer:start-import");
const importStatusQuery = defineQuery<ImporterStatus>("importer:status");
const importConfigQuery =
  defineQuery<ImporterWorkflowParams>("importer:config");
const mappingUpdate = defineUpdate<
  void,
  [
    {
      mappings: Mapping[];
    }
  ]
>("importer:update-mapping");

const acts = proxyActivities<ReturnType<typeof makeActivities>>({
  startToCloseTimeout: "5 minute",
});

/**
 * Entity workflow which represents a complete importer workflow
 */
export async function importer(params: ImporterWorkflowParams) {
  const uploadTimeout = params.uploadTimeout ?? "24 hours";
  const startImportTimeout = params.startImportTimeout ?? "24 hours";
  const compensations: Function[] = [];

  let sourceFile: {
    bucket: string;
    fileReference: string;
    fileFormat: "csv" | "xlsx";
  } | null = null;
  let patches: DataSetPatch[] = [];
  let importStartRequested = false;
  let dataMappingRecommendations: DataMappingRecommendation[] | null = null;
  let validationFileReferences: string[] | null = null;
  let isValidating = false;
  let configuredMappings: Mapping[] | null = null;

  setHandler(
    addFileUpdate,
    (params) => {
      sourceFile = {
        bucket: params.bucket,
        fileReference: params.fileReference,
        fileFormat: params.fileFormat,
      };
    },
    {
      validator: (_params) => {
        return !sourceFile;
      },
    }
  );
  setHandler(
    mappingUpdate,
    (params) => {
      configuredMappings = params.mappings;
    },
    {
      validator: (params) => {
        return !configuredMappings;
      },
    }
  );
  setHandler(addPatchesSignal, (params) => {
    patches.push(...params.patches);
  });
  setHandler(startImportSignal, () => {
    importStartRequested = true;
  });
  setHandler(importConfigQuery, () => {
    return params;
  });
  setHandler(importStatusQuery, () => {
    return {
      isWaitingForFile: sourceFile === null,
      isWaitingForMapping: configuredMappings === null,
      isWaitingForImport: importStartRequested === false,
      isImporting: importStartRequested === true,
      dataMappingRecommendations,
      isValidating,
      validationFileReferences,
      dataMapping: configuredMappings,
    };
  });

  try {
    const hasSourceFile = await condition(
      () => sourceFile !== null,
      uploadTimeout
    );
    if (!hasSourceFile) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: source file not uploaded"
      );
    }

    // perform import
    const outputFileReference = "output";
    const outputFileReferences = await acts.processSourceFile({
      bucket: sourceFile!.bucket,
      fileReference: sourceFile!.fileReference,
      format: sourceFile!.fileFormat,
      outputFileReference,
      formatOptions: {},
    });

    // process source file writes one json file

    dataMappingRecommendations = await acts.getMappingRecommendations({
      bucket: sourceFile!.bucket,
      fileReference: outputFileReferences[0],
      columnConfig: params.columnConfig,
    });
    isValidating = true;

    // TODO: get real data mappings from frontend before starting validation

    //  apply mapping - writes chunks and returns chunks references

    validationFileReferences = [];
    // const startUniqueValidations = Date.now();

    // const uniqueValidationFileReference =
    //   await acts.processDataUniqueValidations({
    //     bucket: sourceFile!.bucket,
    //     fileReferences: outputFileReferences,
    //     columnConfig: params.columnConfig,
    //     dataMapping: dataMappingRecommendations!.map((item) => ({
    //       sourceColumn: item.sourceColumn,
    //       targetColumn: item.targetColumn,
    //     })) as DataMapping[],
    //   });
    // if (uniqueValidationFileReference) {
    //   validationFileReferences.push(uniqueValidationFileReference);
    // }
    // console.log(
    //   `unique validations took ${Date.now() - startUniqueValidations}ms`
    // );

    const startAllValidations = Date.now();
    const limit = pLimit(10);
    const parallelValidations = outputFileReferences.map((fileReference) =>
      limit(() =>
        acts.processDataValidations({
          bucket: sourceFile!.bucket,
          fileReference,
          columnConfig: params.columnConfig,
          dataMapping: dataMappingRecommendations!.map((item) => ({
            sourceColumn: item.sourceColumn,
            targetColumn: item.targetColumn,
          })) as DataMapping[],
        })
      )
    );
    // const parallelValidations = outputFileReferences.map((fileReference) =>
    //   acts.processDataValidations({
    //     bucket: sourceFile!.bucket,
    //     fileReference,
    //     columnConfig: params.columnConfig,
    //     dataMapping: dataMappingRecommendations!.map((item) => ({
    //       sourceColumn: item.sourceColumn,
    //       targetColumn: item.targetColumn,
    //     })) as DataMapping[],
    //   })
    // );
    const fileReferences = await Promise.all(parallelValidations);
    validationFileReferences.push(...fileReferences);

    console.log(`all validations took ${Date.now() - startAllValidations}ms`);
    isValidating = false;
    await condition(() => configuredMappings !== null, startImportTimeout);

    const hasImportStartRequested = await condition(
      () => importStartRequested === true,
      startImportTimeout
    );
    if (!hasImportStartRequested) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: import start not requested"
      );
    }
  } catch (err) {
    for (const compensation of compensations) {
      await compensation();
    }
    throw err;
  } finally {
    // await acts.deleteBucket({ bucket: sourceFile!.bucket });
  }
}

async function performValidations(patchCount: number) {
  /*
   generate stats file - { name: {nonunique:{"foo":2}}, id: {}} - save minio
  validations chunked - write chunk error file
 
   */
}

// merge all chunks (data + errors) into one file
