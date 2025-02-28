import { keyBy, mapValues } from "lodash";
import {
	type AnyBulkWriteOperation,
	type InsertManyResult,
	type MongoClient,
	ObjectId,
} from "mongodb";

import type {
	SourceFileStatsPerColumn,
	ValidationResult,
} from "../domain/DataAnalyzer";
import type {
	DataSet,
	DataSetPatch,
	DataSetRow,
	SourceDataSet,
	SourceDataSetRow,
} from "../domain/DataSet";
import type { Meta } from "../workflows/importer.workflow";

export class Database {
	constructor(private mongoClient: MongoClient) {}

	async getStatsPerColumn(
		importerId: string,
		uniqueColumns: string[],
	): Promise<SourceFileStatsPerColumn> {
		if (uniqueColumns.length === 0) {
			return {};
		}
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
			await this.getDataCollection(importerId)
				.aggregate<SourceFileStatsPerColumn>(
					[
						{
							$facet: $facet,
						},
						{
							$replaceRoot: {
								newRoot: $replaceRoot,
							},
						},
					],
					{ allowDiskUse: true },
				)
				.toArray()
		)[0];
		return stats;
	}

	async getTotalRecordsCount(importerId: string): Promise<number> {
		return this.getDataCollection(importerId).countDocuments();
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
		sourceData: SourceDataSet,
	): Promise<number> {
		await this.getSourceDataCollection(importerId).drop();
		if (sourceData.length === 0) {
			return 0;
		}
		const result =
			await this.getSourceDataCollection(importerId).insertMany(sourceData);
		return result.insertedCount;
	}

	async dropDataCollection(importerId: string): Promise<void> {
		await this.getDataCollection(importerId).drop();
	}

	async getSourceData(importerId: string): Promise<SourceDataSet> {
		return this.getSourceDataCollection(importerId).find().toArray();
	}

	async getData(
		importerId: string,
		skip: number,
		limit: number,
	): Promise<DataSet> {
		return this.getDataCollection(importerId)
			.find()
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	async getDataRecord(
		importerId: string,
		rowId: string,
	): Promise<DataSetRow | null> {
		return this.getDataCollection(importerId).findOne({
			_id: new ObjectId(rowId),
		});
	}

	async createIndexes(importerId: string): Promise<void> {
		await this.getDataCollection(importerId).createIndexes([
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
		data: DataSet,
	): Promise<InsertManyResult<DataSetRow>> {
		return this.getDataCollection(importerId).insertMany(data);
	}

	async getFirstSourceRow(
		importerId: string,
	): Promise<SourceDataSetRow | null> {
		return this.getSourceDataCollection(importerId).findOne();
	}

	async updateDataWithValidationMessages(
		importerId: string,
		validationResults: ValidationResult[],
	) {
		const writes: AnyBulkWriteOperation<DataSetRow>[] = [];
		for (const validationResult of validationResults) {
			// clear messages
			writes.push({
				updateOne: {
					filter: {
						_id: new ObjectId(validationResult.rowId),
					},
					update: {
						$set: {
							[`data.${validationResult.column}.messages`]: [],
						},
					},
				},
			});
			for (const message of validationResult.messages) {
				// write messages
				writes.push({
					updateOne: {
						filter: {
							_id: new ObjectId(validationResult.rowId),
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
		if (writes.length === 0) {
			return;
		}
		await this.getDataCollection(importerId).bulkWrite(writes);
	}

	async applyPatches(
		importerId: string,
		idempotencyKey: string,
		patches: DataSetPatch[],
	) {
		let patchIndex = 0;
		const modifiedRecords: { rowId: string; column: string }[] = [];
		for (const patch of patches) {
			const patchesIdempotencyKey = `${idempotencyKey}-${patchIndex}`;
			const targetColumn = `data.${patch.column}`;
			const result = await this.getDataCollection(importerId).updateOne(
				{
					_id: new ObjectId(patch.rowId),
					appliedPatches: { $nin: [patchesIdempotencyKey] },
				},
				{
					$set: {
						[`${targetColumn}.value`]: patch.newValue,
						[`${targetColumn}.messages`]: [],
					},
					$push: {
						history: patch,
						appliedPatches: patchesIdempotencyKey,
					},
				},
			);
			if (result.modifiedCount > 0) {
				modifiedRecords.push({
					rowId: patch.rowId,
					column: patch.column,
				});
			}
			patchIndex++;
		}
		return { modifiedRecords };
	}

	async getMeta(importerId: string): Promise<Meta> {
		const messageCounts = await this.getDataCollection(importerId)
			.aggregate<{ column: string; count: number }>([
				{
					$project: {
						data: 1,
					},
				},
				{
					$project: {
						messages: {
							$objectToArray: "$data",
						},
					},
				},
				{
					$unwind: "$messages",
				},
				{
					$project: {
						field: "$messages.k",
						numberOfMessages: {
							$size: "$messages.v.messages",
						},
					},
				},
				{
					$group: {
						_id: "$field",
						count: {
							$sum: "$numberOfMessages",
						},
					},
				},
				{
					$project: {
						_id: 0,
						column: "$_id",
						count: 1,
					},
				},
			])
			.toArray();

		return { messageCount: mapValues(keyBy(messageCounts, "column"), "count") };
	}

	private getDataCollection(importerId: string) {
		return this.mongoClient.db(importerId).collection<DataSetRow>("data");
	}

	private getSourceDataCollection(importerId: string) {
		return this.mongoClient
			.db(importerId)
			.collection<SourceDataSetRow>("sourceData");
	}
}
