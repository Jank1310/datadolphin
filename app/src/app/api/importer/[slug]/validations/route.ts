import minioClient from "@/lib/minioClient";
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
  if (!result.validations) {
    return new NextResponse("not found", { status: 404 });
  }
  const stream = await minioClient.getObject(
    result.validations.bucket,
    result.validations.fileReference
  );
  // TODO find better to directly return stream...
  const buffers = [];
  // node.js readable streams implement the async iterator protocol
  for await (const data of stream) {
    buffers.push(data);
  }
  const fileAsBuffer = Buffer.concat(buffers);
  return new Response(fileAsBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
