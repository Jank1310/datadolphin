import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const recommendations = await handle.query(
    "importer:data-mapping-recommendations"
  );
  return NextResponse.json(recommendations);
}
