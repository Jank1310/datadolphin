import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { chunk, pull } from "lodash";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import {
  ColumnValidators,
  DataAnalyzer,
  DataMappingRecommendation,
  SourceFileStatsPerColumn,
} from "./domain/DataAnalyzer";
import { DataSet, DataSetPatch, DataSetRow } from "./domain/DataSet";
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
      const jsonWithRowIds: DataSet = json.map((row, index) => ({
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
      const sourceJsonData: DataSet = JSON.parse(fileData.toString());
      const mappedData = sourceJsonData.map((row) => {
        const newRow: DataSetRow = { __rowId: row.__rowId };
        const mappingsWithTargetColumn = params.dataMapping.filter(
          (mapping) => mapping.targetColumn
        );
        for (const mapping of mappingsWithTargetColumn) {
          newRow[mapping.targetColumn as string] = row[mapping.sourceColumn!];
        }
        return newRow;
      });
      const mappedDataChunks = chunk(mappedData, 5000);
      return await Promise.all(
        mappedDataChunks.map(async (json, index) => {
          const mappedChunkJsonData = Buffer.from(JSON.stringify(json));
          const chunkedFileReference = `mapped-${index}.json`;
          await fileStore.putFile(
            params.bucket,
            chunkedFileReference,
            mappedChunkJsonData
          );
          return chunkedFileReference;
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
      const sourceColumns = pull(Object.keys(jsonData[0]), "__rowId");
      return dataAnalyzer.generateMappingRecommendations(
        sourceColumns,
        params.columnConfig
      );
    },
    processDataValidations: async (params: {
      bucket: string;
      fileReference: string;
      validatorColumns: ColumnValidators;
      outputFileReference: string;
      stats: SourceFileStatsPerColumn;
      patches: DataSetPatch[];
    }): Promise<{ errorFileReference: string; errorCount: number }> => {
      console.time("validations");
      const referenceId = params.fileReference.split("-")[1].split(".")[0];
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
      console.timeEnd("validations");
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
    }): Promise<SourceFileStatsPerColumn> => {
      console.time("generate-stats");
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData: DataSet = JSON.parse(fileData.toString());
      const patchedData = applyPatches(jsonData, params.patches);
      const stats = dataAnalyzer.getStats(patchedData, params.uniqueColumns);
      console.timeEnd("generate-stats");
      return stats;
    },
    mergeChunks: async (params: {
      bucket: string;
      fileReferences: string[];
      outputFileReference: string;
    }) => {
      let allJsonData: DataSet = [];
      for (const fileReference of params.fileReferences) {
        const fileData = await fileStore.getFile(params.bucket, fileReference);
        allJsonData.push(...JSON.parse(fileData.toString()));
      }
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        Buffer.from(JSON.stringify(allJsonData))
      );
    },
    export: async (params: {
      bucket: string;
      fileReference: string;
      patches: DataSetPatch[];
      callbackUrl: string;
      exportFileReference: string;
    }): Promise<string> => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const allJsonData: DataSet = JSON.parse(fileData.toString());
      const patchedData = applyPatches(allJsonData, params.patches ?? []);
      await fileStore.putFile(
        params.bucket,
        params.exportFileReference,
        Buffer.from(JSON.stringify(patchedData))
      );
      const host = process.env.API_URL ?? "http://localhost:3000";
      const downloadUrl = `${host}/api/download/${params.bucket}`;
      console.log("downloadUrl", downloadUrl);
      fetch(params.callbackUrl, {
        method: "POST",
        body: downloadUrl,
      });
      return params.exportFileReference;
    },
  };
}

function applyPatches(data: DataSet, patches: DataSetPatch[]): DataSet {
  const newData = data.slice();
  for (const patch of patches) {
    const indexToUpdate = newData.findIndex(
      (item) => item.__rowId === patch.rowId
    );
    if (indexToUpdate !== -1) {
      newData[indexToUpdate] = {
        ...newData[indexToUpdate],
        [patch.column]: patch.newValue,
      };
    }
  }
  return newData;
}
