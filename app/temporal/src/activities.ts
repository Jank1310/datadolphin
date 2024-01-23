import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { chunk } from "lodash";
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
    }): Promise<string[]> => {
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

      return await Promise.all(
        chunk(jsonWithRowIds, 1000).map(async (jsonString, index) => {
          const jsonData = Buffer.from(JSON.stringify(jsonString));
          const outputFileReference = `${params.outputFileReference}-${index}.json`;
          await fileStore.putFile(params.bucket, outputFileReference, jsonData);
          return outputFileReference;
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
      // only the first 10 rows are used to detect the columns
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
      columnConfig: ColumnConfig[];
      dataMapping: DataMapping[];
    }) => {
      const allColumnsWithValidators = params.columnConfig.filter(
        (column) => column.validations?.length
      );

      const validatorColumns: Record<
        string,
        { column: string; regex?: string | undefined }[]
      > = {
        required: [],
        regex: [],
        phone: [],
        email: [],
      };
      for (const column of allColumnsWithValidators) {
        for (const validator of column.validations!) {
          switch (validator.type) {
            case "required":
              validatorColumns.required.push({ column: column.key });
              break;
            case "regex":
              validatorColumns.regex.push({
                column: column.key,
                regex: validator.regex,
              });
              break;
            case "phone":
              validatorColumns.phone.push({ column: column.key });
              break;
            case "email":
              validatorColumns.email.push({ column: column.key });
              break;
          }
        }
      }

      // [
      //   {
      //     rowId: 0,
      //     column: 'name',
      //     errors: [
      //       {
      //         type: 'required',
      //         message: 'value is required'
      //       },
      //       {
      //         type: 'unique',
      //         message: 'value is not unique'
      //       }
      //     ]
      //   },
      // ]

      const referenceId = params.fileReference.split("-")[1].split(".")[0];
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      const jsonData = JSON.parse(fileData.toString());
      const validatedDate = dataAnalyzer.processDataValidations(
        jsonData,
        params.dataMapping,
        validatorColumns
      );
      const validationFileReference = `validated-${referenceId}.json`;
      await fileStore.putFile(
        params.bucket,
        validationFileReference,
        Buffer.from(JSON.stringify(validatedDate))
      );
      return validationFileReference;
    },
    processDataUniqueValidations: async (params: {
      bucket: string;
      fileReferences: string[];
      columnConfig: ColumnConfig[];
      dataMapping: DataMapping[];
    }): Promise<string | undefined> => {
      const allColumnsWithValidators = params.columnConfig.filter(
        (column) => column.validations?.length
      );
      const validatorColumns: Record<
        string,
        { column: string; regex?: string | undefined }[]
      > = {
        unique: [],
      };

      for (const column of allColumnsWithValidators) {
        for (const validator of column.validations!) {
          switch (validator.type) {
            case "unique":
              validatorColumns.unique.push({ column: column.key });
              break;
          }
        }
      }
      if (validatorColumns.unique.length === 0) {
        return;
      }
      const jsonData: Record<string, unknown>[] = (
        await Promise.all(
          params.fileReferences.map(async (fileReference) => {
            const fileData = await fileStore.getFile(
              params.bucket,
              fileReference
            );
            return JSON.parse(fileData.toString());
          })
        )
      ).flat();
      const validatedDate = dataAnalyzer.processDataValidations(
        jsonData,
        params.dataMapping,
        validatorColumns
      );
      const validationFileReference = `validated-unique.json`;
      await fileStore.putFile(
        params.bucket,
        validationFileReference,
        Buffer.from(JSON.stringify(validatedDate))
      );
      return validationFileReference;
    },
  };
}
