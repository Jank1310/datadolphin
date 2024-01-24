import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { chunk, pull } from "lodash";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import {
  ColumnValidators,
  DataAnalyzer,
  DataMappingRecommendation,
} from "./domain/DataAnalyzer";
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
      const sourceJsonData: Record<string, unknown>[] = JSON.parse(
        fileData.toString()
      );
      const mappedData = sourceJsonData.map((row) => {
        const newRow: Record<string, unknown> = {};
        newRow.__rowId = row.__rowId;
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
      statsFileReference: string;
      validatorColumns: ColumnValidators;
    }) => {
      console.time("validations");
      const referenceId = params.fileReference.split("-")[1].split(".")[0];
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData = JSON.parse(fileData.toString());

      const statsFileData = await fileStore.getFile(
        params.bucket,
        params.statsFileReference
      );
      const statsData = JSON.parse(statsFileData.toString());
      const errorData = dataAnalyzer.processDataValidations(
        jsonData,
        params.validatorColumns,
        statsData
      );
      const errorFileReference = `errors-${referenceId}.json`;
      await fileStore.putFile(
        params.bucket,
        errorFileReference,
        Buffer.from(JSON.stringify(errorData))
      );
      console.timeEnd("validations");
      return errorFileReference;
    },
    generateStatsFile: async (params: {
      bucket: string;
      fileReference: string;
      outputFileReference: string;
      uniqueColumns: string[];
    }): Promise<void> => {
      console.time("generate-stats");
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData: Record<string, unknown>[] = JSON.parse(
        fileData.toString()
      );
      const stats = dataAnalyzer.getStats(jsonData, params.uniqueColumns);
      const statsData = Buffer.from(JSON.stringify(stats));
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        statsData
      );
      console.timeEnd("generate-stats");
    },
    mergeChunks: async (params: {
      bucket: string;
      fileReferences: string[];
      outputFileReference: string;
    }) => {
      let allJsonData: Record<string, unknown>[] = [];
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
  };
}
