import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { randomUUID } from "crypto";
import * as env from "env-var";
import { writeFile } from "fs/promises";
import * as Minio from "minio";
import { NextRequest } from "next/server";
import { extname } from "path";

const minioClient = new Minio.Client({
  endPoint: env.get("MINIO_HOST").required().asString(),
  port: 9000,
  useSSL: false,
  accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
  secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
});

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
  const filePath = `/tmp/${file.name}`;
  await writeFile(filePath, fileBuffer);

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
    await minioClient.fPutObject(bucket, destFileName, filePath, metadata);
  } catch (error) {
    console.error(error);
    return new Response("Failed to upload file", { status: 500 });
  }
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  await handle.signal("importer:add-file", {
    fileReference: destFileName,
    fileFormat: extname(file.name) === ".csv" ? "csv" : "xlsx",
    bucket,
  });
  await handle.signal("importer:start-import");
  return new Response("", { status: 201 });
}
