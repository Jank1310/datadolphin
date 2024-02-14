import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";
import { ImporterStatus } from "../ImporterDto";

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const mappings = await req.json();
  const workflowState = await handle.query<ImporterStatus>("importer:status");
  if (workflowState.state === "closed") {
    return NextResponse.json({ error: "Importer is closed" }, { status: 410 });
  }
  await handle.executeUpdate("importer:update-mapping", {
    args: [{ mappings }],
  });
  return new NextResponse(undefined, {
    status: 201,
  });
}
