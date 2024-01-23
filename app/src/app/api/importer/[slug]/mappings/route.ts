import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";
import { DataMapping } from "../ImporterDto";

export async function PUT(
  _req: NextRequest,
  { params, body }: { params: { slug: string }; body: DataMapping[] }
) {
  const { slug: importerId } = params;
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const mappings = body;
  await handle.executeUpdate("importer:update-mapping", {
    args: [{ mappings }],
  });
  return new NextResponse(undefined, {
    status: 201,
  });
}
