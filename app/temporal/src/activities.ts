import { Context } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/workflow";
import csv from "csv";
import { pullAll, uniq } from "lodash";
import { ObjectId } from "mongodb";
import XLSX from "xlsx";
import { ColumnConfig } from "./domain/ColumnConfig";
import {
  ColumnValidators,
  DataAnalyzer,
  DataMappingRecommendation,
  SourceFileStatsPerColumn,
  ValidationResult,
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
import { Mapping, Meta } from "./workflows/importer.workflow";
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
    }): Promise<number> => {
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
            ...row,
            __sourceRowId: index,
            _id: new ObjectId(),
          } as SourceDataSetRow)
      );
      console.log("insert rows", jsonWithRowIds.length);
      console.time("insert");
      const insertedCount = await database.insertSourceData(
        params.importerId,
        jsonWithRowIds
      );
      console.timeEnd("insert");
      if (insertedCount !== jsonWithRowIds.length) {
        throw ApplicationFailure.nonRetryable("Failed to insert all rows");
      }
      return insertedCount;
    },
    applyMappings: async (params: {
      importerId: string;
      dataMapping: Mapping[];
    }): Promise<void> => {
      // drop collection for idempotency
      await database.dropDataCollection(params.importerId);
      const sourceJsonData = await database.getSourceData(params.importerId);
      console.log("got sourceData", sourceJsonData.length);
      // stats
      // {name: {messageCount: 104}}
      const mappingsWithTargetColumn = params.dataMapping.filter(
        (mapping) => mapping.targetColumn
      );
      const mappedData = sourceJsonData.map((row) => {
        const newRow: DataSetRow = {
          _id: new ObjectId(),
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
      await database.createIndexes(params.importerId);

      console.time("writing data");
      await database.saveData(params.importerId, mappedData);
      console.timeEnd("writing data");
    },
    getMappingRecommendations: async (params: {
      importerId: string;
      columnConfig: ColumnConfig[];
    }): Promise<DataMappingRecommendation[]> => {
      const firstRecord = await database.getFirstSourceRow(params.importerId);
      if (!firstRecord) {
        return [];
      }
      // all rows should have all available headers (see source file processing)
      const allEmptyColumns = Object.keys(firstRecord).filter(
        (key) => key.startsWith("__EMPTY") || key === ""
      );
      const sourceColumns = pullAll(
        Object.keys(firstRecord as SourceDataSetRow),
        ["__sourceRowId", "_id", ...allEmptyColumns]
      );
      return dataAnalyzer.generateMappingRecommendations(
        sourceColumns,
        params.columnConfig
      );
    },
    processDataValidations: async (params: {
      importerId: string;
      columnValidators: ColumnValidators;
      stats: SourceFileStatsPerColumn;
      skip: number;
      limit: number;
    }): Promise<string[]> => {
      const jsonData: DataSet = await database.getData(
        params.importerId,
        params.skip,
        params.limit
      );
      if (!jsonData || jsonData.length === 0) {
        return [];
      }

      const validationResults = dataAnalyzer.processDataValidations(
        jsonData,
        params.columnValidators,
        params.stats
      );

      await database.updateDataWithValidationMessages(
        params.importerId,
        validationResults
      );

      const affectedColumns = uniq(
        validationResults.map((result) => result.column)
      );
      return affectedColumns;
    },
    processDataValidationForRecord: async (params: {
      importerId: string;
      columnValidators: ColumnValidators;
      stats: SourceFileStatsPerColumn;
      rowId: string;
    }): Promise<ValidationResult[]> => {
      const row = await database.getDataRecord(params.importerId, params.rowId);
      if (!row) {
        return [];
      }

      const validationResults = dataAnalyzer.processDataValidations(
        [row],
        params.columnValidators,
        params.stats
      );

      await database.updateDataWithValidationMessages(
        params.importerId,
        validationResults
      );
      return validationResults;
    },
    applyPatches: async (params: {
      importerId: string;
      patches: DataSetPatch[];
    }): Promise<{
      modifiedRecords: { rowId: string; column: string }[];
    }> => {
      Context.current().log.info(
        `applying ${params.patches.length} patches`,
        params
      );
      const idempotencyKey = `patch-${Context.current().info.activityId}`;
      return await database.applyPatches(
        params.importerId,
        idempotencyKey,
        params.patches
      );
    },
    generateStatsPerColumn: async (params: {
      importerId: string;
      uniqueColumns: string[];
    }): Promise<{
      columnStats: SourceFileStatsPerColumn;
      totalCount: number;
    }> => {
      console.time("generate-stats");
      const columnStats = await database.getStatsPerColumn(
        params.importerId,
        params.uniqueColumns
      );
      console.timeEnd("generate-stats");

      console.time("total-count");
      const totalCount = await database.getTotalRecordsCount(params.importerId);
      console.timeEnd("total-count");

      return { columnStats, totalCount };
    },
    generateMeta: async (params: { importerId: string }): Promise<Meta> => {
      console.time("generate-meta");
      const meta = await database.getMeta(params.importerId);
      console.timeEnd("generate-meta");

      return meta;
    },
    invokeCallback: async (params: {
      importerId: string;
      callbackUrl: string;
    }): Promise<void> => {
      const host = process.env.PUBLIC_API_URL ?? "http://localhost:3000";
      const downloadUrl = `${host}/api/download/${params.importerId}`;
      await fetch(params.callbackUrl, {
        method: "POST",
        body: downloadUrl,
      });
    },
    createDatabases: async (params: { importerId: string }): Promise<void> => {
      await database.dropDatabases(params.importerId);
      await database.createDatabases(params.importerId);
    },
    dropDatabase: async (params: { importerId: string }): Promise<void> => {
      await database.dropDatabases(params.importerId);
    },
  };
}
