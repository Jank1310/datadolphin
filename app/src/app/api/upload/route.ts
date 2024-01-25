import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { extname } from "path";

import minioClient from "../../../lib/minioClient";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file: File | null = formData.get("file") as unknown as File;
  const importerId = formData.get("importerId") as unknown as string;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (!importerId) {
    return new Response("importerId missing", { status: 500 });
  }
  if (!fileBuffer) {
    return new Response("file missing", { status: 500 });
  }

  const bucket = importerId;
  const bucketExists = await minioClient.bucketExists(bucket);

  if (bucketExists === false) {
    await minioClient.makeBucket(bucket);
  }

  const metadata = {
    "Content-Type": file.type,
    FileName: file.name,
    ImporterId: importerId,
  };

  const destFileName = `${randomUUID()}${extname(file.name)}`;
  try {
    await minioClient.putObject(bucket, destFileName, fileBuffer, metadata);
  } catch (error) {
    console.error(error);
    return new Response("Failed to upload file", { status: 500 });
  }
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  await handle.executeUpdate("importer:add-file", {
    args: [
      {
        fileReference: destFileName,
        fileFormat: extname(file.name) === ".csv" ? "csv" : "xlsx",
        bucket,
      },
    ],
  });
  return new Response("", { status: 201 });
}
