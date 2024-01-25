import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { chunk } from "lodash";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import {
  DataAnalyzer,
  DataMappingRecommendation,
  Stats,
} from "./domain/DataAnalyzer";
import { DataSetPatch } from "./domain/DataSet";
import { ValidatorType } from "./domain/validators";
import { FileStore } from "./infrastructure/FileStore";
import { Mapping } from "./workflows/importer.workflow";
export interface DownloadSourceFileParams {
  filename: string;
  importerId: string;
}

export interface DownloadSourceFileReturnType {
  metaData: Record<string, string>;
  localFilePath: string;
}

export type ValidatorColumns = Record<
  ValidatorType,
  { column: string; regex?: string | undefined }[]
>;

export function makeActivities(
  fileStore: FileStore,
  dataAnalyzer: DataAnalyzer
) {
  return {
    deleteBucket: async (params: { bucket: string }) => {
      await fileStore.deleteBucket(params.bucket);
    },
    processSourceFile: async (params: {
      bucket: string;
      fileReference: string;
      format: string;
      formatOptions: { delimiter?: string };
      outputFileReference: string;
    }): Promise<void> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      let json: Record<string, unknown>[];
      switch (params.format) {
        case "csv":
          json = await new Promise<Record<string, unknown>[]>(
            (resolve, reject) => {
              csv.parse(
                fileData,
                {
                  columns: true,
                  delimiter: params.formatOptions.delimiter ?? ",",
                  relax_column_count: true,
                },
                (err, records) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(records);
                  }
                }
              );
            }
          );
          console.log("received rows", json.length);

          break;
        case "xlsx":
          const workbook = XLSX.read(fileData, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            //! this is needed to get the header columns on all rows
            raw: true,
            defval: "",
          });
          console.log("received rows", json.length);

          break;
        default:
          throw ApplicationFailure.nonRetryable(
            `Unsupported format ${params.format}`
          );
      }
      const jsonWithRowIds = json.map((row, index) => ({
        __rowId: index,
        ...row,
      }));

      const jsonData = Buffer.from(JSON.stringify(jsonWithRowIds));
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        jsonData
      );
    },
    applyMappings: async (params: {
      bucket: string;
      fileReference: string;
      dataMapping: Mapping[];
    }): Promise<string[]> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData: Record<string, unknown>[] = JSON.parse(
        fileData.toString()
      );
      const mappedData = jsonData.map((row) => {
        const newRow: Record<string, unknown> = {};
        newRow.__rowId = row.__rowId;
        for (const mapping of params.dataMapping.filter(
          (mapping) => mapping.targetColumn
        )) {
          newRow[mapping.targetColumn as string] = row[mapping.sourceColumn!];
        }
        return newRow;
      });

      return await Promise.all(
        chunk(mappedData, 5000).map(async (json, index) => {
          const jsonData = Buffer.from(JSON.stringify(json));
          const chunktFileReference = `mapped-${index}.json`;
          await fileStore.putFile(params.bucket, chunktFileReference, jsonData);
          return chunktFileReference;
        })
      );
    },
    getMappingRecommendations: async (params: {
      bucket: string;
      fileReference: string;
      columnConfig: ColumnConfig[];
    }): Promise<DataMappingRecommendation[]> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData = JSON.parse(fileData.toString());
      // all rows should have all available headers (see source file processing)
      const sourceColumns = Object.keys(jsonData[0]);
      return dataAnalyzer.generateMappingRecommendations(
        sourceColumns,
        params.columnConfig
      );
    },
    processDataValidations: async (params: {
      bucket: string;
      fileReference: string;
      validatorColumns: ValidatorColumns;
      outputFileReference: string;
      stats: Stats;
      patches: DataSetPatch[];
    }): Promise<{ errorFileReference: string; errorCount: number }> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData = JSON.parse(fileData.toString());
      const patchedData = applyPatches(jsonData, params.patches);
      const errorData = dataAnalyzer.processDataValidations(
        patchedData,
        params.validatorColumns,
        params.stats
      );
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        Buffer.from(JSON.stringify(errorData))
      );
      return {
        errorFileReference: params.outputFileReference,
        errorCount: errorData.length,
      };
    },
    generateStats: async (params: {
      bucket: string;
      fileReference: string;
      uniqueColumns: string[];
      patches: DataSetPatch[];
    }): Promise<Stats> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData: Record<string, unknown>[] = JSON.parse(
        fileData.toString()
      );
      const patchedData = applyPatches(jsonData, params.patches);
      return dataAnalyzer.getStats(patchedData, params.uniqueColumns);
    },
    mergeChunks: async (params: {
      bucket: string;
      fileReferences: string[];
      outputFileReference: string;
      patches?: DataSetPatch[];
    }) => {
      let allJsonData: Record<string, unknown>[] = [];
      for (const fileReference of params.fileReferences) {
        const fileData = await fileStore.getFile(params.bucket, fileReference);
        allJsonData.push(...JSON.parse(fileData.toString()));
      }
      const patchedData = applyPatches(allJsonData, params.patches ?? []);
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        Buffer.from(JSON.stringify(patchedData))
      );
    },
    invokeCallback: async (params: { bucket: string; callbackUrl: string }) => {
      const host = process.env.API_URL ?? "http://localhost:3000";
      const downloadUrl = `${host}/api/download/${params.bucket}`;
      console.log("downloadUrl", downloadUrl);
      fetch(params.callbackUrl, {
        method: "POST",
        body: downloadUrl,
      });
    },
  };
}

function applyPatches(
  data: Record<string, unknown>[],
  patches: DataSetPatch[]
): Record<string, unknown>[] {
  const newData = data.slice();
  for (const patch of patches) {
    const indexToUpdate = newData.findIndex(
      (item) => item.__rowId === patch.row
    );
    if (indexToUpdate !== -1) {
      newData[indexToUpdate] = {
        ...newData[indexToUpdate],
        [patch.col]: patch.newValue,
      };
    }
  }
  return newData;
}
