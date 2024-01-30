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
import { sum } from "lodash";
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
  let isValidating = false;
  let configuredMappings: Mapping[] | null = null;
  let messageCount = 0;

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
      fileHasMessages: messageCount > 0,
      dataMappingRecommendations,
      isValidating,
      dataMapping: configuredMappings,
    };
  });
  setHandler(importPatchesQuery, () => {
    return patches;
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

    // perform import
    await acts.processSourceFile({
      importerId,
      fileReference: sourceFile!.fileReference,
      format: sourceFile!.fileFormat,
      formatOptions: {},
    });

    dataMappingRecommendations = await acts.getMappingRecommendations({
      importerId,
      columnConfig: params.columnConfig,
    });

    const hasConfiguredMappings = await condition(
      () => configuredMappings !== null,
      startImportTimeout
    );
    if (!hasConfiguredMappings) {
      throw ApplicationFailure.nonRetryable("Timeout: mappings not configured");
    }
    await acts.applyMappings({
      importerId,
      dataMapping: configuredMappings!,
    });

    await performValidations();

    const hasImportStartRequested = await condition(
      () => importStartRequested === true,
      startImportTimeout
    );
    if (!hasImportStartRequested) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: import start not requested"
      );
    }

    const hasValidationMessages = await condition(
      () => messageCount === 0,
      startImportTimeout // own timeout for messages?
    );
    if (!hasValidationMessages) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: validation still has messages"
      );
    }

    // we dont have any more messages
    await acts.invokeCallback({
      importerId,
      callbackUrl: params.callbackUrl,
    });
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

    const validatorColumns = {
      unique: [],
    } as ColumnValidators;
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
    const stats = await acts.generateStats({
      importerId,
      uniqueColumns: validatorColumns.unique.map((item) => item.column),
    });
    const limitFct = pLimit(100);
    // TODO: check if limit is ok
    const limit = 5000;
    const dataCount = await acts.getDataCount({
      importerId,
    });
    const parallelValidations = Array.from(
      Array(Math.ceil(dataCount / limit)).keys()
    ).map((_key: number, index: number) =>
      limitFct(() => {
        return acts.processDataValidations({
          importerId,
          validatorColumns,
          stats,
          skip: index * limit,
          limit,
        });
      })
    );
    const messageCountArray = await Promise.all(parallelValidations);
    messageCount = sum(messageCountArray);
    isValidating = false;
  }
}
