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
          const jsonFromCsv = await new Promise<Record<string, unknown>[]>(
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
          console.log("received rows", jsonFromCsv.length);
          jsonData = Buffer.from(
            JSON.stringify(
              jsonFromCsv.map((row, index) => ({ __rowId: index, ...row }))
            )
          );
          break;
        case "xlsx":
          const workbook = XLSX.read(fileData, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonFromXlsx = XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(worksheet, {
            //! this is needed to get the header columns on all rows
            raw: true,
            defval: "",
          });
          console.log("received rows", jsonFromXlsx.length);
          console.log(jsonFromXlsx);
          jsonData = Buffer.from(
            JSON.stringify(
              jsonFromXlsx.map((row, index) => ({ __rowId: index, ...row }))
            )
          );
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
      const validatedDate = dataAnalyzer.processDataValidations(
        jsonData,
        params.columnConfig,
        params.dataMapping
      );
      const validationFileReference = "validated.json";
      await fileStore.putFile(
        params.bucket,
        validationFileReference,
        Buffer.from(JSON.stringify(validatedDate))
      );
      return validationFileReference;
    },
  };
}
