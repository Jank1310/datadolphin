import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const recommendations = await handle.query(
    "importer:data-mapping-recommendations"
  );
  return NextResponse.json({ recommendations });
}
