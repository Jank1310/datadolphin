import {
  ApplicationFailure,
  condition,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
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

const addFileSignal = defineSignal<
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
  let data: Record<string, unknown>[] = [];

  setHandler(addFileSignal, (params) => {
    sourceFile = {
      bucket: params.bucket,
      fileReference: params.fileReference,
      fileFormat: params.fileFormat,
    };
  });
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
      isWaitingForImport: importStartRequested === false,
      isImporting: importStartRequested === true,
      dataMappingRecommendations,
      data,
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
    const hasImportStartRequested = await condition(
      () => importStartRequested === true,
      startImportTimeout
    );
    if (!hasImportStartRequested) {
      throw ApplicationFailure.nonRetryable(
        "Timeout: import start not requested"
      );
    }
    // perform import
    const outputFileReference = "output";
    await acts.processSourceFile({
      bucket: sourceFile!.bucket,
      fileReference: sourceFile!.fileReference,
      format: sourceFile!.fileFormat,
      outputFileReference,
      formatOptions: {},
    });
    dataMappingRecommendations = await acts.getMappingRecommendations({
      bucket: sourceFile!.bucket,
      fileReference: outputFileReference,
      columnConfig: params.columnConfig,
    });
    // TODO: get real data mappings from frontend before starting validation
    data = await acts.processDataValidations({
      bucket: sourceFile!.bucket,
      fileReference: outputFileReference,
      columnConfig: params.columnConfig,
      dataMapping: dataMappingRecommendations.map((item) => ({
        sourceColumn: item.sourceColumn,
        targetColumn: item.targetColumn,
      })) as DataMapping[],
    });
  } catch (err) {
    for (const compensation of compensations) {
      await compensation();
    }
    throw err;
  } finally {
    await acts.deleteBucket({ bucket: sourceFile!.bucket });
  }
}
