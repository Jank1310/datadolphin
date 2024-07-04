import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { extname } from "path";

import { getImporterManager } from "@/lib/ImporterManager";
import { getMinioClient } from "../../../lib/minioClient";

export async function POST(req: NextRequest) {
  const { importerId, bucket, destFileName, fileFormat, delimiter } = await handleFileUpload(req);
  const importerManager = await getImporterManager();
  await importerManager.addFile(importerId, destFileName, fileFormat, bucket, delimiter);
  return new Response(undefined, { status: 201 });
}

async function handleFileUpload(req: NextRequest) {
  const formData = await req.formData();
  const file: File | null = formData.get("file") as unknown as File;
  const importerId = formData.get("importerId") as unknown as string;
  const delimiter = formData.get("delimiter") as unknown as string;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (!importerId) {
    throw new Error("importerId missing");
  }
  if (!fileBuffer) {
    throw new Error("file missing");
  }

  const bucket = importerId;
  const bucketExists = await getMinioClient().bucketExists(bucket);

  if (bucketExists === false) {
    await getMinioClient().makeBucket(bucket);
  }

  const metadata = {
    "Content-Type": file.type,
    FileName: encodeURIComponent(file.name),
    ImporterId: importerId,
  };

  const destFileName = `${randomUUID()}${extname(file.name)}`;
  try {
    await getMinioClient().putObject(bucket, destFileName, fileBuffer, metadata);
  } catch (error) {
    console.error(error);
    throw new Error("Error uploading file");
  }
  const fileFormat = extname(file.name) === ".csv" ? "csv" : "xlsx";

  return {
    importerId,
    bucket,
    destFileName,
    fileFormat,
    delimiter,
  };
}
