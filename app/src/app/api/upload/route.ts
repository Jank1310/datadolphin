import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";

import { getImporterManager } from "@/lib/ImporterManager";
import { validateAuth } from "@/lib/validateAuth";
import { getMinioClient } from "../../../lib/minioClient";

export async function POST(req: NextRequest) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { importerId, bucket, destFileName, fileFormat } =
    await handleFileUpload(req);
  const importerManager = await getImporterManager();
  await importerManager.addFile(importerId, destFileName, fileFormat, bucket);
  return new Response(undefined, { status: 201 });
}

async function handleFileUpload(req: NextRequest) {
  const formData = await req.formData();
  const file: File | null = formData.get("file") as unknown as File;
  const importerId = formData.get("importerId") as unknown as string;
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
    FileName: file.name,
    ImporterId: importerId,
  };

  const destFileName = `${randomUUID()}${extname(file.name)}`;
  try {
    await getMinioClient().putObject(
      bucket,
      destFileName,
      fileBuffer,
      metadata
    );
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
  };
}
