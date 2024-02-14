import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";
import { ImporterConfig, ImporterDto, ImporterStatus } from "./ImporterDto";

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
  const [status, config] = await Promise.all([
    (await handle.query("importer:status")) as ImporterStatus,
    (await handle.query("importer:config")) as ImporterConfig,
  ]);
  const importerDto: ImporterDto = {
    importerId,
    config,
    status,
  };
  return NextResponse.json(importerDto);
}
