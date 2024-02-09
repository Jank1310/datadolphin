import {
  DEFAULT_TEMPORAL_QUEUE,
  getTemporalWorkflowClient,
} from "@/lib/temporalClient";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ImporterConfig } from "./[slug]/ImporterDto";

export type ImportWorkflowPostPayload = ImporterConfig;

export interface ImportWorkflowPostResponse {
  importerId: string;
}

export async function POST(req: NextRequest) {
  const importerId = `imp-${randomUUID()}`;
  const client = await getTemporalWorkflowClient();
  const body = (await req.json()) as ImportWorkflowPostPayload;
  //TODO validate request
  await client.start("importer", {
    workflowId: importerId,
    taskQueue: DEFAULT_TEMPORAL_QUEUE,
    args: [
      {
        columnConfig: body.columnConfig,
        callbackUrl: body.callbackUrl,
        uploadTimeout: body.uploadTimeout,
        startImportTimeout: body.startImportTimeout,
        name: body.name,
        description: body.description,
        meta: body.meta ?? {},
        logo: body.logo,
        redirectUrl: body.redirectUrl,
        design: body.design,
      } as ImporterConfig,
    ],
  });
  return NextResponse.json(
    {
      importerId,
    },
    { status: 201 }
  );
}
