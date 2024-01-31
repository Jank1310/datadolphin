import {
  AnyBulkWriteOperation,
  InsertManyResult,
  MongoClient,
  ObjectId,
} from "mongodb";
import { SourceFileStatsPerColumn } from "../domain/DataAnalyzer";
import {
  DataSet,
  DataSetPatch,
  DataSetRow,
  SourceDataSet,
  SourceDataSetRow,
} from "../domain/DataSet";
import { ValidationMessage } from "../domain/ValidationMessage";

export class Database {
  constructor(private mongoClient: MongoClient) {}

  async getStats(
    importerId: string,
    uniqueColumns: string[]
  ): Promise<SourceFileStatsPerColumn> {
    const $facet: Record<string, unknown> = {};
    const $replaceRoot: Record<string, unknown> = {};
    for (const uniqueColumn of uniqueColumns) {
      $facet[uniqueColumn] = [
        {
          $group: {
            _id: `$data.${uniqueColumn}.value`,
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $ne: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            k: "$_id",
            v: "$count",
          },
        },
      ];
      $replaceRoot[uniqueColumn] = {
        nonunique: {
          $arrayToObject: `$${uniqueColumn}`,
        },
      };
    }
    const stats = (
      await this.mongoClient
        .db(importerId)
        .collection<DataSetRow>("data")
        .aggregate<SourceFileStatsPerColumn>([
          {
            $facet: $facet,
          },
          {
            $replaceRoot: {
              newRoot: $replaceRoot,
            },
          },
        ])
        .toArray()
    )[0];
    return stats;
  }

  async getTotalCount(importerId: string): Promise<number> {
    return this.mongoClient
      .db(importerId)
      .collection<DataSetRow>("data")
      .countDocuments();
  }

  async createDatabases(importerId: string): Promise<void> {
    await this.mongoClient.db(importerId).createCollection("data");
    await this.mongoClient.db(importerId).createCollection("sourceData");
    await this.mongoClient.db(importerId).createCollection("meta");
  }

  async dropDatabases(importerId: string): Promise<void> {
    await this.mongoClient.db(importerId).dropDatabase();
  }

  async insertSourceData(
    importerId: string,
    sourceData: SourceDataSet
  ): Promise<InsertManyResult<SourceDataSetRow>> {
    await this.mongoClient
      .db(importerId)
      .collection<SourceDataSetRow>("sourceData")
      .drop();
    return this.mongoClient
      .db(importerId)
      .collection<SourceDataSetRow>("sourceData")
      .insertMany(sourceData);
  }

  async dropDataCollection(importerId: string): Promise<void> {
    await this.mongoClient.db(importerId).collection("data").drop();
  }

  async getSourceData(importerId: string): Promise<SourceDataSet> {
    return this.mongoClient
      .db(importerId)
      .collection<SourceDataSetRow>("sourceData")
      .find()
      .toArray();
  }

  async getData(
    importerId: string,
    skip: number,
    limit: number
  ): Promise<DataSet> {
    return this.mongoClient
      .db(importerId)
      .collection<DataSetRow>("data")
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async createIndexes(importerId: string): Promise<void> {
    await this.mongoClient
      .db(importerId)
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
  }

  async saveData(
    importerId: string,
    data: DataSet
  ): Promise<InsertManyResult<DataSetRow>> {
    return this.mongoClient.db(importerId).collection("data").insertMany(data);
  }

  async getFirstSourceRow(
    importerId: string
  ): Promise<SourceDataSetRow | null> {
    return this.mongoClient
      .db(importerId)
      .collection<SourceDataSetRow>("sourceData")
      .findOne();
  }

  async updateDataWithValidationMessages(
    importerId: string,
    validationResults: {
      rowId: ObjectId;
      column: string;
      messages: ValidationMessage[];
    }[]
  ) {
    const writes: AnyBulkWriteOperation<Document>[] = [];
    for (const validationResult of validationResults) {
      for (const message of validationResult.messages) {
        writes.push({
          updateOne: {
            filter: {
              _id: validationResult.rowId,
            },
            update: {
              $addToSet: {
                [`data.${validationResult.column}.messages`]: message,
              },
            },
          },
        });
      }
    }
    await this.mongoClient.db(importerId).collection("data").bulkWrite(writes);
  }

  async applyPatch(importerId: string, patch: DataSetPatch) {
    const targetColumn = `data.${patch.column}`;
    return this.mongoClient
      .db(importerId)
      .collection("data")
      .updateOne(
        { __sourceRowId: patch.rowId },
        {
          $set: {
            [targetColumn]: patch.newValue,
            $addToSet: {
              history: patch,
            },
          },
        }
      );
  }
}
