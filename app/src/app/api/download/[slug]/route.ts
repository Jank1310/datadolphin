import { NextRequest, NextResponse } from "next/server";

import { validateAuth } from "@/lib/validateAuth";
import { getMinioClient } from "../../../../lib/minioClient";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const fileReference = "export.json";

  if (!importerId) {
    return new Response("importerId missing", { status: 500 });
  }

  const bucket = importerId;
  const bucketExists = await getMinioClient().bucketExists(bucket);

  if (bucketExists === false) {
    return new Response("bucket does not exist", { status: 500 });
  }

  const fileBuffer = await getFile(bucket, fileReference);

  return new Response(fileBuffer, { status: 200 });
}

async function getFile(bucket: string, fileReference: string): Promise<Buffer> {
  try {
    const fileStats = await getMinioClient().statObject(bucket, fileReference);
    if (!fileStats) {
      throw new Error();
    }
  } catch (error) {
    throw new Error(`could not find file ${fileReference} in bucket ${bucket}`);
  }
  const stream = await getMinioClient().getObject(bucket, fileReference);
  const data = await new Promise<Buffer>((resolve, reject) => {
    let chunks: Buffer[] = [];
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("data", (chunk) => chunks.push(chunk));
  });
  return data;
}
