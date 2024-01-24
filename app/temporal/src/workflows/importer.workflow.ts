import {
  ApplicationFailure,
  CancellationScope,
  condition,
  defineQuery,
  defineSignal,
  defineUpdate,
  isCancellation,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import pLimit from "p-limit";
import { makeActivities } from "../activities";
import { ColumnConfig } from "../domain/ColumnConfig";
import {
  ColumnValidators,
  DataMappingRecommendation,
} from "../domain/DataAnalyzer";
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
  sourceData: { bucket: string; fileReference: string } | null;
  validations: { bucket: string; fileReference: string } | null;
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
const importPatchesQuery = defineQuery<DataSetPatch[]>("importer:patches");

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
  let mappedSourceData: {
    bucket: string;
    fileReference: string;
  } | null = null;
  let latestValidations: {
    bucket: string;
    fileReference: string;
  } | null = null;

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
      console.log("handle update mapping", params);
      configuredMappings = params.mappings;
    },
    {
      validator: (_params) => {
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
      sourceData: mappedSourceData,
      validations: latestValidations,
    };
  });
  setHandler(importPatchesQuery, () => {
    return patches;
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
    const sourceFileReference = "source.json";
    await acts.processSourceFile({
      bucket: sourceFile!.bucket,
      fileReference: sourceFile!.fileReference,
      format: sourceFile!.fileFormat,
      outputFileReference: sourceFileReference,
      formatOptions: {},
    });

    dataMappingRecommendations = await acts.getMappingRecommendations({
      bucket: sourceFile!.bucket,
      fileReference: sourceFileReference,
      columnConfig: params.columnConfig,
    });

    await condition(() => configuredMappings !== null, startImportTimeout);

    const chunkedFileReferences = await acts.applyMappings({
      bucket: sourceFile!.bucket,
      fileReference: sourceFileReference,
      dataMapping: dataMappingRecommendations.map((item) => ({
        sourceColumn: item.sourceColumn,
        targetColumn: item.targetColumn,
      })),
    });
    const mappedSourceDataFileReference = "target.json";
    await acts.mergeChunks({
      bucket: sourceFile!.bucket,
      fileReferences: chunkedFileReferences,
      outputFileReference: mappedSourceDataFileReference,
    });
    mappedSourceData = {
      bucket: sourceFile!.bucket,
      fileReference: mappedSourceDataFileReference,
    };
    await performValidations(sourceFileReference, chunkedFileReferences);

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
    const doCompensations = async () => {
      for (const compensation of compensations) {
        await compensation();
      }
    };
    if (isCancellation(err)) {
      await CancellationScope.nonCancellable(() => doCompensations());
    } else if (err instanceof ApplicationFailure && err.nonRetryable) {
      await doCompensations();
    }
    throw err; // <-- Fail the workflow
  } finally {
    await acts.deleteBucket({ bucket: sourceFile!.bucket });
  }

  async function performValidations(
    sourceFileReference: string,
    chunkedFileReferences: string[]
  ) {
    isValidating = true;

    const allColumnsWithValidators = params.columnConfig.filter(
      (column) => column.validations?.length
    );

    const validatorColumns = {} as ColumnValidators;
    for (const column of allColumnsWithValidators) {
      for (const validator of column.validations!) {
        if (!validatorColumns[validator.type]) {
          validatorColumns[validator.type] = [];
        }
        validatorColumns[validator.type].push({
          column: column.key,
          config: validator,
        });
      }
    }

    // TODO: apply patches
    const statsFileReference = "stats.json";
    const startStats = Date.now();
    await acts.generateStatsFile({
      bucket: sourceFile!.bucket,
      fileReference: sourceFileReference,
      outputFileReference: statsFileReference,
      uniqueColumns: validatorColumns.unique?.map((item) => item.column) ?? [],
    });
    console.log(`generate stats file took ${Date.now() - startStats}ms`);

    const startAllValidations = Date.now();
    const limit = pLimit(100);
    const parallelValidations = chunkedFileReferences.map((fileReference) =>
      limit(() =>
        acts.processDataValidations({
          bucket: sourceFile!.bucket,
          fileReference,
          statsFileReference,
          validatorColumns,
        })
      )
    );
    const validationsFileReferences = await Promise.all(parallelValidations);
    await acts.mergeChunks({
      bucket: sourceFile!.bucket,
      fileReferences: validationsFileReferences,
      outputFileReference: "validations.json",
    });
    console.log(`all validations took ${Date.now() - startAllValidations}ms`);
    latestValidations = {
      bucket: sourceFile!.bucket,
      fileReference: "validations.json",
    };
    isValidating = false;
  }
}
