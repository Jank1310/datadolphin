import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  await handle.executeUpdate("importer:start-import");
  return NextResponse.json({ importerId });
}
