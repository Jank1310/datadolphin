import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";
import { DataSetPatch } from "../ImporterDto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const result = await handle.query<DataSetPatch[]>("importer:patches");
  return NextResponse.json(result);
}
