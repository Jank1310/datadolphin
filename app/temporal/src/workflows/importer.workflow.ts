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
  workflowInfo,
} from "@temporalio/workflow";
import env from "env-var";
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
  isProcessingSourceFile: boolean;
  isMappingData: boolean;
  isValidatingData: boolean;
  isWaitingForImport: boolean;
  isImporting: boolean;
  totalRows: number;
  dataMapping: Mapping[] | null;
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
const startImportSignal = defineSignal<[]>("importer:start-import");
const importStatusQuery = defineQuery<ImporterStatus>("importer:status");
const dataMappingRecommendationsQuery = defineQuery<
  DataMappingRecommendation[]
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
const recordUpdate = defineUpdate<void, [{ patches: DataSetPatch[] }]>(
  "importer:update-record"
);

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
  const compensations: Function[] = [];

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
    },
    {
      validator: (params) => {
        return params.patches.length > 0;
      },
    }
  );
  setHandler(startImportSignal, () => {
    importStartRequested = true;
  });
  setHandler(importerConfigQuery, () => {
    return params;
  });
  setHandler(dataMappingRecommendationsQuery, () => {
    return dataMappingRecommendations ?? [];
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
    isValidating = true;
    await performValidations();
    isValidating = false;

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

    // we dont have any more messages
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

  async function performValidations() {
    isValidating = true;

    const allMappedColumnsWithValidators = params.columnConfig.filter(
      (column) =>
        column.validations?.length &&
        (configuredMappings ?? []).find(
          (mapping) => mapping.targetColumn === column.key
        )
    );

    const validatorColumns = {} as ColumnValidators;
    for (const column of allMappedColumnsWithValidators) {
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
    const { columnStats, totalCount } = await acts.generateStats({
      importerId,
      uniqueColumns: validatorColumns.unique.map((item) => item.column),
    });
    //! Optimize import limit
    const limitFct = pLimit(validationParallelLimit);
    const limit = 5000;
    const parallelValidations = Array.from(
      Array(Math.ceil(totalCount / limit)).keys()
    ).map((_key: number, index: number) =>
      limitFct(() => {
        return acts.processDataValidations({
          importerId,
          validatorColumns,
          stats: columnStats,
          skip: index * limit,
          limit,
        });
      })
    );
    await Promise.all(parallelValidations);
    isValidating = false;
  }
}
