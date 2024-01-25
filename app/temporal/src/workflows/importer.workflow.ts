import {
  ApplicationFailure,
  condition,
  defineQuery,
  defineSignal,
  defineUpdate,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import { sum } from "lodash";
import pLimit from "p-limit";
import { ValidatorColumns, makeActivities } from "../activities";
import { ColumnConfig } from "../domain/ColumnConfig";
import { DataMappingRecommendation } from "../domain/DataAnalyzer";
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
  let exportFileReference: string | null = null;
  let isValidating = false;
  let configuredMappings: Mapping[] | null = null;
  let errorCount = 0;

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
      fileHasErrors: errorCount > 0,
      dataMappingRecommendations,
      isValidating,
      exportFileReference,
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

    // await condition(() => configuredMappings !== null, startImportTimeout);

    const chunkedFileReferences = await acts.applyMappings({
      bucket: sourceFile!.bucket,
      fileReference: sourceFileReference,
      dataMapping: dataMappingRecommendations.map((item) => ({
        sourceColumn: item.sourceColumn,
        targetColumn: item.targetColumn,
      })),
    });

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

    const hasValidationNoErrors = await condition(
      () => errorCount === 0,
      startImportTimeout // own timeout for errors?
    );
    if (!hasValidationNoErrors) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: validation still has errors"
      );
    }

    // we dont have any more errors and target.json has all patches applied
    exportFileReference = "target.json";

    void acts.invokeCallback({
      bucket: sourceFile!.bucket,
      callbackUrl: params.callbackUrl,
    });
  } catch (err) {
    for (const compensation of compensations) {
      await compensation();
    }
    throw err;
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

    const validatorColumns = {} as ValidatorColumns;
    for (const column of allColumnsWithValidators) {
      for (const validator of column.validations!) {
        if (validatorColumns[validator.type] === undefined) {
          validatorColumns[validator.type] = [];
        }
        if (validator.type === "regex") {
          validatorColumns[validator.type].push({
            column: column.key,
            regex: validator.regex,
          });
        } else {
          validatorColumns[validator.type].push({ column: column.key });
        }
      }
    }

    const stats = await acts.generateStats({
      bucket: sourceFile!.bucket,
      fileReference: sourceFileReference,
      uniqueColumns: validatorColumns.unique.map((item) => item.column),
      patches,
    });

    const startAllValidations = Date.now();
    const limit = pLimit(100);
    const parallelValidations = chunkedFileReferences.map((fileReference) =>
      limit(() => {
        const referenceId = fileReference.split("-")[1].split(".")[0];
        const errorFileReference = `errors-${referenceId}.json`;
        return acts.processDataValidations({
          bucket: sourceFile!.bucket,
          fileReference,
          validatorColumns,
          outputFileReference: errorFileReference,
          stats,
          patches,
        });
      })
    );
    const validationErrors = await Promise.all(parallelValidations);
    errorCount = sum(validationErrors.map((item) => item.errorCount));
    await acts.mergeChunks({
      bucket: sourceFile!.bucket,
      fileReferences: validationErrors.map((item) => item.errorFileReference),
      outputFileReference: "errors.json",
    });
    await acts.mergeChunks({
      bucket: sourceFile!.bucket,
      fileReferences: chunkedFileReferences,
      outputFileReference: "target.json",
      patches,
    });
    console.log(`all validations took ${Date.now() - startAllValidations}ms`);
    isValidating = false;
  }
}
