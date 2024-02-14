import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";
import { ImporterStatus } from "../../ImporterDto";

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
  const workflowState = await handle.query<ImporterStatus>("importer:status");
  if (workflowState.state === "closed") {
    return NextResponse.json({ error: "Importer is closed" }, { status: 410 });
  }
  const recommendations = await handle.query(
    "importer:data-mapping-recommendations"
  );
  return NextResponse.json({ recommendations });
}
