import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateServerAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateServerAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  await handle.signal("importer:close");
  return NextResponse.json({});
}
