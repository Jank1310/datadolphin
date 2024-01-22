import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import { DataAnalyzer, DataMappingRecommendation } from "./domain/DataAnalyzer";
import { DataMapping } from "./domain/DataMapping";
import { FileStore } from "./infrastructure/FileStore";

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
    }) => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      let jsonData: Buffer;
      switch (params.format) {
        case "csv":
          const rows = await new Promise<Record<string, string>[]>(
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
          console.log("received rows", rows.length);
          jsonData = Buffer.from(JSON.stringify(rows));
          break;
        case "xlsx":
          const workbook = XLSX.read(fileData, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {
            //! this is needed to get the header columns on all rows
            raw: true,
            defval: "",
          });
          console.log("received rows", json.length);
          console.log(json);
          jsonData = Buffer.from(JSON.stringify(json));
          break;
        default:
          throw ApplicationFailure.nonRetryable(
            `Unsupported format ${params.format}`
          );
      }
      await fileStore.putFile(
        params.bucket,
        params.outputFileReference,
        jsonData
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
      return dataAnalyzer.generateMappingRecommendations(
        // only the first 10 rows are used to detect the columns
        // all rows should have all available headers (see source file processing)
        jsonData.slice(0, 10),
        params.columnConfig
      );
    },
    processDataValidations: async (params: {
      bucket: string;
      fileReference: string;
      columnConfig: ColumnConfig[];
      dataMapping: DataMapping[];
    }) => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData = JSON.parse(fileData.toString());
      return dataAnalyzer.processDataValidations(
        jsonData,
        params.columnConfig,
        params.dataMapping
      );
    },
  };
}
