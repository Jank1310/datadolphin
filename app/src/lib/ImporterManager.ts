import {
  DataMapping,
  DataMappingRecommendation,
  ImporterConfig,
  ImporterDto,
} from "@/app/api/importer/[slug]/ImporterDto";
import { WorkflowClient } from "@temporalio/client";
import { Db, MongoClient } from "mongodb";
import { ImporterStatus } from "../../temporal/lib/workflows/importer.workflow";
import { getMongoClient } from "./mongoClient";
import { getTemporalWorkflowClient } from "./temporalClient";

export class ImporterManager {
  constructor(
    private readonly workflowClient: WorkflowClient,
    private readonly mongoClient: MongoClient
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
    importerId: string
  ): Promise<DataMappingRecommendation[]> {
    const handle = this.workflowClient.getHandle(importerId);
    const workflowState = await handle.query<ImporterStatus>("importer:status");
    if (workflowState.state === "closed") {
      throw new Error("Importer is closed");
    }
    const recommendations = await handle.query<DataMappingRecommendation[]>(
      "importer:data-mapping-recommendations"
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
    size: number
  ): Promise<unknown[]> {
    const handle = this.workflowClient.getHandle(importerId);
    const workflowState = await handle.query<ImporterStatus>("importer:status");
    if (workflowState.state === "closed") {
      throw new Error("Importer is closed");
    }
    const db = this.getDb(importerId);
    const records = await db
      .collection("data")
      .find()
      .sort({ __sourceRowId: 1 })
      .skip(page * size)
      .limit(size)
      .toArray();
    return records;
  }

  public async patchRecords(
    importerId: string,
    patches: { column: string; rowId: string; newValue: string }[]
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
    bucket: string
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
        },
      ],
    });
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
