import {
  ApplicationFailure,
  CancellationScope,
  condition,
  defineQuery,
  defineUpdate,
  isCancellation,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import env from "env-var";
import { keyBy, mapValues, sum, times } from "lodash";
import pLimit from "p-limit";
import { makeActivities } from "../activities";
import { ColumnConfig } from "../domain/ColumnConfig";
import {
  ColumnValidators,
  DataMappingRecommendation,
} from "../domain/DataAnalyzer";
import { DataSetPatch } from "../domain/DataSet";
import { ValidationMessage } from "../domain/ValidationMessage";
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
  isProcessingSourceFile: boolean;
  isMappingData: boolean;
  isValidatingData: boolean;
  isWaitingForImport: boolean;
  isImporting: boolean;
  totalRows: number;
  dataMapping: Mapping[] | null;
  meta: Meta | null;
}

export interface Mapping {
  targetColumn: string | null;
  sourceColumn: string;
}

export interface Meta {
  messageCount: Record<string /* columnId */, number>;
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
const startImportSignal = defineUpdate<void, []>("importer:start-import");
const importStatusQuery = defineQuery<ImporterStatus>("importer:status");
const dataMappingRecommendationsQuery = defineQuery<
  DataMappingRecommendation[] | null
>("importer:data-mapping-recommendations");
const importerConfigQuery =
  defineQuery<ImporterWorkflowParams>("importer:config");
const mappingUpdate = defineUpdate<
  void,
  [
    {
      mappings: Mapping[];
    }
  ]
>("importer:update-mapping");
const recordUpdate = defineUpdate<
  {
    /**
     * means that the whole column might have changes
     */
    changedColumns: string[];
    newMessagesByColumn: Record<string /* columnId */, ValidationMessage[]>;
  },
  [{ patches: DataSetPatch[] }]
>("importer:update-record");

const acts = proxyActivities<ReturnType<typeof makeActivities>>({
  startToCloseTimeout: "5 minute",
});

const validationParallelLimit = env
  .get("VALIDATION_PARALLEL_LIMIT")
  .default(10)
  .asIntPositive();
/**
 * Entity workflow which represents a complete importer workflow
 */
export async function importer(params: ImporterWorkflowParams) {
  const uploadTimeout = params.uploadTimeout ?? "24 hours";
  const startImportTimeout = params.startImportTimeout ?? "24 hours";

  let sourceFile: {
    bucket: string;
    fileReference: string;
    fileFormat: "csv" | "xlsx";
  } | null = null;
  let dataMappingRecommendations: DataMappingRecommendation[] | null = null;
  let importStartRequested = false;
  let isValidating = false;
  let isProcessingSourceFile = false;
  let isMappingData = false;
  let configuredMappings: Mapping[] | null = null;
  let markedAsClosed = false;
  let totalRows = 0;
  let meta: Meta | null = null;

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
      validator: (_params) => {
        return !configuredMappings;
      },
    }
  );
  setHandler(
    recordUpdate,
    async (updateParams) => {
      await acts.applyPatches({
        importerId: workflowInfo().workflowId,
        patches: updateParams.patches,
      });

      let changedColumns: string[] = [];
      const newMessages: Record<string, ValidationMessage[]> = {};

      for (const patch of updateParams.patches) {
        const columnConfig = params.columnConfig.find(
          (item) => item.key === patch.column
        );
        if (!columnConfig) {
          continue;
        }
        const columnValidations = columnConfig.validations;

        if (columnValidations?.length) {
          if (columnValidations.find((item) => item.type === "unique")) {
            // unique validation
            changedColumns = await performValidations([columnConfig]);
          } else {
            // other validations
            const validationResults = await performRecordValidation(
              [columnConfig],
              patch.rowId
            );
            const validationResultsGroupedByColumn = mapValues(
              keyBy(validationResults, "column"),
              "messages"
            );
            newMessages[patch.column] =
              validationResultsGroupedByColumn[patch.column] || [];
          }
        }
      }
      return {
        changedColumns,
        newMessagesByColumn: newMessages,
      };
    },
    {
      validator: (params) => {
        return params.patches.length > 0;
      },
    }
  );
  setHandler(
    startImportSignal,
    () => {
      importStartRequested = true;
    },
    {
      validator: () => {
        const totalMessageCount = sum(Object.values(meta?.messageCount ?? {}));
        if (totalMessageCount > 0) {
          throw new ApplicationFailure(
            "Import not allowed due to existing messages"
          );
        }
        return true;
      },
    }
  );
  setHandler(importerConfigQuery, () => {
    return params;
  });
  setHandler(dataMappingRecommendationsQuery, () => {
    return dataMappingRecommendations ?? null;
  });

  setHandler(importStatusQuery, () => {
    return {
      isWaitingForFile: sourceFile === null,
      isWaitingForMapping: configuredMappings === null,
      isWaitingForImport: importStartRequested === false,
      isImporting: importStartRequested === true,
      isMappingData,
      isValidatingData: isValidating,
      isProcessingSourceFile,
      dataMapping: configuredMappings,
      totalRows,
      meta,
    };
  });

  const importerId = workflowInfo().workflowId;

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
    isProcessingSourceFile = true;
    totalRows = await acts.processSourceFile({
      importerId,
      fileReference: sourceFile!.fileReference,
      format: sourceFile!.fileFormat,
      formatOptions: {},
    });
    dataMappingRecommendations = await acts.getMappingRecommendations({
      importerId,
      columnConfig: params.columnConfig,
    });
    isProcessingSourceFile = false;

    const hasConfiguredMappings = await condition(
      () => configuredMappings !== null,
      startImportTimeout
    );
    if (!hasConfiguredMappings) {
      throw ApplicationFailure.nonRetryable("Timeout: mappings not configured");
    }
    isMappingData = true;
    await acts.applyMappings({
      importerId,
      dataMapping: configuredMappings!,
    });
    isMappingData = false;

    const allMappedColumnsWithValidators = params.columnConfig.filter(
      (column) =>
        column.validations?.length &&
        (configuredMappings ?? []).find(
          (mapping) => mapping.targetColumn === column.key
        )
    );
    await performValidations(allMappedColumnsWithValidators);

    const hasImportStartRequested = await condition(
      () => importStartRequested === true,
      startImportTimeout
    );
    if (!hasImportStartRequested) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: import start not requested"
      );
    }

    // TODO add activity to get current number messages and prevent import if existing messages
    // @see https://github.com/Jank1310/datadolphin/issues/40

    // we don't have any more messages
    await acts.invokeCallback({
      importerId,
      callbackUrl: params.callbackUrl,
    });

    const hasImportMarkedAsClosed = await condition(
      () => markedAsClosed === true,
      "14 days" // internal max lifetime
    );
    if (!hasImportMarkedAsClosed) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: import not marked as closed"
      );
    }
  } catch (err) {
    if (isCancellation(err)) {
      await CancellationScope.nonCancellable(() => cleanUp());
    }
    throw err; // <-- Fail the workflow
  } finally {
    // <-- Wont be called on cancellation or termination!
    await cleanUp();
  }

  async function cleanUp() {
    await acts.deleteBucket({ bucket: sourceFile!.bucket });
    await acts.dropDatabase({ importerId });
  }

  async function performValidations(columnConfigs: ColumnConfig[]) {
    isValidating = true;

    const columnValidators = {} as ColumnValidators;
    for (const column of columnConfigs) {
      for (const validator of column.validations!) {
        if (!columnValidators[validator.type]) {
          columnValidators[validator.type] = [];
        }
        columnValidators[validator.type].push({
          column: column.key,
          config: validator,
        });
      }
    }
    const { columnStats, totalCount } = await acts.generateStatsPerColumn({
      importerId,
      uniqueColumns: columnValidators.unique.map((item) => item.column),
    });
    //! Optimize import limit
    const limitFct = pLimit(validationParallelLimit);
    const limit = 5000;
    const validationRecordChunks = Math.ceil(totalCount / limit);
    const parallelValidations = times(validationRecordChunks, (chunkIndex) =>
      limitFct(() => {
        return acts.processDataValidations({
          importerId,
          columnValidators,
          stats: columnStats,
          skip: chunkIndex * limit,
          limit,
        });
      })
    );
    const affectedColumns = await Promise.all(parallelValidations);

    meta = await acts.generateMeta({ importerId });
    isValidating = false;
    return affectedColumns.flat();
  }

  async function performRecordValidation(
    columnConfigs: ColumnConfig[],
    rowId: string
  ) {
    isValidating = true;
    const columnValidators = {} as ColumnValidators;
    for (const column of columnConfigs) {
      for (const validator of column.validations!) {
        if (!columnValidators[validator.type]) {
          columnValidators[validator.type] = [];
        }
        columnValidators[validator.type].push({
          column: column.key,
          config: validator,
        });
      }
    }
    const { columnStats } = await acts.generateStatsPerColumn({
      importerId,
      uniqueColumns: columnValidators.unique?.map((item) => item.column) ?? [],
    });
    const validationResults = await acts.processDataValidationForRecord({
      importerId,
      columnValidators,
      stats: columnStats,
      rowId,
    });
    meta = await acts.generateMeta({ importerId });
    isValidating = false;
    return validationResults;
  }
}
