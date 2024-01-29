import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { pull } from "lodash";
import { AnyBulkWriteOperation, ObjectId } from "mongodb";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import {
  ColumnValidators,
  DataAnalyzer,
  DataMappingRecommendation,
  SourceFileStatsPerColumn,
} from "./domain/DataAnalyzer";
import {
  DataSet,
  DataSetPatch,
  DataSetRow,
  SourceDataSet,
  SourceDataSetRow,
} from "./domain/DataSet";
import { Database } from "./infrastructure/Database";
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
  database: Database,
  dataAnalyzer: DataAnalyzer
) {
  return {
    deleteBucket: async (params: { bucket: string }) => {
      await fileStore.deleteBucket(params.bucket);
    },
    processSourceFile: async (params: {
      importerId: string;
      fileReference: string;
      format: string;
      formatOptions: { delimiter?: string };
    }): Promise<void> => {
      const fileData = await fileStore.getFile(
        params.importerId,
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
      const jsonWithRowIds: SourceDataSet = json.map(
        (row, index) =>
          ({
            __sourceRowId: index,
            ...row,
            _id: new ObjectId(),
          } as SourceDataSetRow)
      );
      console.log("insert rows", jsonWithRowIds.length);
      console.time("insert");
      await database.mongoClient
        .db(params.importerId)
        .collection("sourceData")
        .deleteMany();
      const result = await database.mongoClient
        .db(params.importerId)
        .collection("sourceData")
        .insertMany(jsonWithRowIds);
      console.timeEnd("insert");
      if (result.insertedCount !== jsonWithRowIds.length) {
        throw ApplicationFailure.nonRetryable("Failed to insert all rows");
      }
    },
    applyMappings: async (params: {
      importerId: string;
      dataMapping: Mapping[];
    }): Promise<void> => {
      const sourceJsonData: SourceDataSet = await database.mongoClient
        .db(params.importerId)
        .collection<SourceDataSetRow>("sourceData")
        .find()
        .toArray();

      console.log("got sourceData", sourceJsonData.length);
      // stats
      // {name: {messageCount: 104}}
      const mappingsWithTargetColumn = params.dataMapping.filter(
        (mapping) => mapping.targetColumn
      );
      const mappedData = sourceJsonData.map((row) => {
        const newRow: DataSetRow = {
          __sourceRowId: row.__sourceRowId,
          data: {},
        };
        for (const mapping of mappingsWithTargetColumn) {
          newRow.data[mapping.targetColumn as string] = {
            value: row[mapping.sourceColumn!],
            messages: [],
          };
        }
        return newRow;
      });

      console.log("creating indexes");
      await database.mongoClient
        .db(params.importerId)
        .collection("data")
        .createIndexes([
          {
            key: {
              "data.$**": 1,
            },
            name: "data_1",
          },
          {
            key: {
              __sourceRowId: 1,
            },
            name: "sourceRowId_1",
            unique: true,
          },
        ]);

      console.time("writing data");
      await database.mongoClient
        .db(params.importerId)
        .collection("data")
        .insertMany(mappedData);
      console.timeEnd("writing data");
    },
    getMappingRecommendations: async (params: {
      importerId: string;
      columnConfig: ColumnConfig[];
    }): Promise<DataMappingRecommendation[]> => {
      const firstRecord = await database.mongoClient
        .db(params.importerId)
        .collection<DataSetRow>("sourceData")
        .findOne();
      // all rows should have all available headers (see source file processing)
      const sourceColumns = pull(
        Object.keys(firstRecord as DataSetRow),
        "__sourceRowId"
      );
      return dataAnalyzer.generateMappingRecommendations(
        sourceColumns,
        params.columnConfig
      );
    },
    processDataValidations: async (params: {
      importerId: string;
      validatorColumns: ColumnValidators;
      stats: SourceFileStatsPerColumn;
      skip: number;
      limit: number;
    }): Promise<number> => {
      const jsonData: DataSet = await database.mongoClient
        .db(params.importerId)
        .collection<DataSetRow>("data")
        .find()
        .skip(params.skip)
        .limit(params.limit)
        .toArray();

      const validationResults = dataAnalyzer.processDataValidations(
        jsonData,
        params.validatorColumns,
        params.stats
      );

      const writes: AnyBulkWriteOperation<Document>[] = [];
      for (const validationResult of validationResults) {
        writes.push({
          updateOne: {
            filter: {
              __sourceRowId: validationResult.rowId,
            },
            update: {
              $push: {
                [`data.${validationResult.column}.messages`]:
                  validationResult.messages,
              },
            },
          },
        });
      }
      await database.mongoClient
        .db(params.importerId)
        .collection("data")
        .bulkWrite(writes);
      // .updateOne(
      //   { __sourceRowId: validationResult.rowId },
      //   {
      //     $push: {
      //       [`data.${validationResult.column}.messages`]:
      //         validationResult.messages,
      //     },
      //   }
      // );

      return validationResults.length;
    },
    applyPatches: async (params: {
      importerId: string;
      patches: DataSetPatch[];
    }): Promise<void> => {
      for (const patch of params.patches) {
        const targetColumn = `data.${patch.column}`;
        await database.mongoClient
          .db(params.importerId)
          .collection("data")
          .updateOne(
            { __sourceRowId: patch.rowId },
            { $set: { [targetColumn]: patch.newValue } }
          );
      }
    },
    generateStats: async (params: {
      importerId: string;
      uniqueColumns: string[];
    }): Promise<SourceFileStatsPerColumn> => {
      console.time("generate-stats");
      const jsonData: DataSet = await database.mongoClient
        .db(params.importerId)
        .collection<DataSetRow>("data")
        .find()
        .toArray();
      const stats = dataAnalyzer.getStats(jsonData, params.uniqueColumns);
      console.timeEnd("generate-stats");
      return stats;
    },
    invokeCallback: async (params: {
      importerId: string;
      callbackUrl: string;
    }): Promise<void> => {
      const host = process.env.API_URL ?? "http://localhost:3000";
      const downloadUrl = `${host}/api/download/${params.importerId}`;
      fetch(params.callbackUrl, {
        method: "POST",
        body: downloadUrl,
      });
    },
    getDataCount: async (params: { importerId: string }): Promise<number> => {
      return database.mongoClient
        .db(params.importerId)
        .collection<DataSetRow>("data")
        .countDocuments();
    },
    createDatabases: async (params: { importerId: string }): Promise<void> => {
      // drop databases
      await database.mongoClient.db(params.importerId).dropDatabase();

      await database.mongoClient.db(params.importerId).createCollection("data");
      await database.mongoClient
        .db(params.importerId)
        .createCollection("sourceData");
      await database.mongoClient.db(params.importerId).createCollection("meta");
    },
    dropDatabase: async (params: { importerId: string }): Promise<void> => {
      await database.mongoClient.db(params.importerId).dropDatabase();
    },
  };
}
