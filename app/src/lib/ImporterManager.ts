import type {
	ColumnValidation,
	DataMapping,
	DataMappingRecommendation,
	ImporterConfig,
	ImporterDto,
	ImporterStatus,
	SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import type { WorkflowClient } from "@temporalio/client";
import type { Db, MongoClient } from "mongodb";
import pRetry from "p-retry";

import { temporal } from "@temporalio/proto";
import { getMongoClient } from "./mongoClient";
import { getTemporalWorkflowClient } from "./temporalClient";

export class ImporterManager {
	constructor(
		private readonly workflowClient: WorkflowClient,
		private readonly mongoClient: MongoClient,
	) {}

	public async getImporterDto(importerId: string) {
		const handle = this.workflowClient.getHandle(importerId);
		const [status, config] = await Promise.all([
			(await handle.query("importer:status")) as ImporterStatus,
			(await handle.query("importer:config")) as ImporterConfig,
		]);
		const importerDto: ImporterDto = {
			importerId,
			config,
			status,
		};
		return importerDto;
	}

	public async getMappingRecommendations(
		importerId: string,
	): Promise<DataMappingRecommendation[]> {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		const recommendations = await handle.query<DataMappingRecommendation[]>(
			"importer:data-mapping-recommendations",
		);
		return recommendations;
	}

	public async updateMappings(importerId: string, mappings: DataMapping[]) {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		await handle.executeUpdate("importer:update-mapping", {
			args: [{ mappings }],
		});
	}

	public async closeImporter(importerId: string) {
		const handle = this.workflowClient.getHandle(importerId);
		await handle.signal("importer:close");
	}

	public async getRecords(
		importerId: string,
		page: number,
		size: number,
		filterErrorsForColumn?: string | null,
	): Promise<{ recordCount: number; records: SourceData[] }> {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		const db = this.getDb(importerId);

		const aggregationPipeline = [];
		if (filterErrorsForColumn) {
			aggregationPipeline.push({
				$project: {
					__sourceRowId: 1,
					data: 1,
					dataAsArray: {
						$objectToArray: "$data",
					},
				},
			});
			if (filterErrorsForColumn === "__ALL_COLUMNS__") {
				aggregationPipeline.push({
					$match: {
						"dataAsArray.v.messages.type": { $exists: true },
					},
				});
			} else {
				aggregationPipeline.push({
					$match: {
						[`data.${filterErrorsForColumn}.messages.type`]: { $exists: true },
					},
				});
			}
		}
		aggregationPipeline.push({
			$facet: {
				totalCount: [{ $count: "count" }],
				records: [
					{ $sort: { __sourceRowId: 1 } },
					{ $skip: page * size },
					{ $limit: size },
				],
			},
		});

		const result = await db
			.collection("data")
			.aggregate<{ totalCount: { count: number }[]; records: SourceData[] }>(
				aggregationPipeline,
			)
			.toArray();
		return {
			records: result[0].records,
			recordCount: result[0].totalCount[0].count,
		};
	}
	public async patchRecords(
		importerId: string,
		patches: { column: string; rowId: string; newValue: string }[],
	) {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		const updateResult = await handle.executeUpdate("importer:update-record", {
			args: [{ patches }],
		});
		return updateResult;
	}

	public async startImport(importerId: string) {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		await handle.executeUpdate("importer:start-import");
	}

	public async addFile(
		importerId: string,
		fileReference: string,
		fileFormat: string,
		bucket: string,
		delimiter: string,
	) {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		await handle.executeUpdate("importer:add-file", {
			args: [
				{
					fileReference,
					fileFormat,
					bucket,
					delimiter,
				},
			],
		});
	}

	public async updateColumnValidation(
		importerId: string,
		columnConfigKey: string,
		columnValidation: ColumnValidation,
	) {
		const handle = this.workflowClient.getHandle(importerId);
		const workflowState = await handle.query<ImporterStatus>("importer:status");
		if (workflowState.state === "closed") {
			throw new Error("Importer is closed");
		}
		await handle.executeUpdate("importer:update-column-validation", {
			args: [
				{
					columnConfigKey,
					columnValidation,
				},
			],
		});
	}

	public async resetImporter(importerId: string): Promise<void> {
		// We have to use signals because update does not work when the workflow is continued as new
		const handle = this.workflowClient.getHandle(importerId);
		const previousRunStatus = await handle.describe();
		await handle.signal("importer:reset");
		const waitForRunning = async () => {
			const status = await handle.describe();
			const isNewWorkflowRunning =
				status.status.code ===
				temporal.api.enums.v1.WorkflowExecutionStatus
					.WORKFLOW_EXECUTION_STATUS_RUNNING;
			const hasStartedNewWorkflowRun =
				previousRunStatus.runId !== status.runId && isNewWorkflowRunning;
			if (hasStartedNewWorkflowRun === false) {
				throw new Error("New workflow run has not started");
			}
		};
		await pRetry(waitForRunning);
	}

	private getDb(importerId: string): Db {
		return this.mongoClient.db(importerId);
	}
}

let importerManager: ImporterManager;

export async function getImporterManager() {
	if (!importerManager) {
		const workflowClient = await getTemporalWorkflowClient();
		const mongoClient = await getMongoClient();
		importerManager = new ImporterManager(workflowClient, mongoClient);
	}
	return importerManager;
}
