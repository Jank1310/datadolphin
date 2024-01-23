import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";
import { ImporterStatus } from "../ImporterDto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const result = await handle.query<ImporterStatus>("importer:status");
  //   if (!result.sourceData) {
  //     return new NextResponse(undefined, { status: 404 });
  //   }
  //   const stream = await minioClient.getObject(
  //     result.sourceData.bucket,
  //     result.sourceData.file
  //   );
  //   return stream;
  return NextResponse.json([]);
}
