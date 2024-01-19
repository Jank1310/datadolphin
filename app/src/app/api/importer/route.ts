import {
  DEFAULT_TEMPORAL_QUEUE,
  getTemporalWorkflowClient,
} from "@/lib/temporalClient";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface ImportWorkflowPostPayload {
  callbackUrl: string;
  columnConfig: unknown[];
}

export interface ImportWorkflowPostResponse {
  importerId: string;
}

export async function POST(req: NextRequest) {
  const importerId = `imp-${randomUUID()}`;
  const client = getTemporalWorkflowClient();
  const body = (await req.json()) as ImportWorkflowPostPayload;
  await client.start("importer", {
    workflowId: importerId,
    taskQueue: DEFAULT_TEMPORAL_QUEUE,
    args: [
      {
        columnConfig: body.columnConfig,
        callbackUrl: body.callbackUrl,
      },
    ],
  });
  return NextResponse.json(
    {
      importerId,
    },
    { status: 201 }
  );
}
