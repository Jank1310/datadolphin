import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const mappings = await req.json();
  await handle.executeUpdate("importer:update-mapping", {
    args: [{ mappings }],
  });
  return new NextResponse(undefined, {
    status: 201,
  });
}
