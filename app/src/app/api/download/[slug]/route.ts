import * as env from "env-var";
import * as Minio from "minio";
import { NextRequest } from "next/server";

const minioClient = new Minio.Client({
  endPoint: env.get("MINIO_HOST").required().asString(),
  port: 9000,
  useSSL: false,
  accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
  secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const fileReference = "export.json";

  if (!importerId) {
    return new Response("importerId missing", { status: 500 });
  }

  const bucket = importerId;
  const bucketExists = await minioClient.bucketExists(bucket);

  if (bucketExists === false) {
    return new Response("bucket does not exist", { status: 500 });
  }

  const fileBuffer = await getFile(bucket, fileReference);

  return new Response(fileBuffer, { status: 200 });
}

async function getFile(bucket: string, fileReference: string): Promise<Buffer> {
  try {
    const fileStats = await minioClient.statObject(bucket, fileReference);
    if (!fileStats) {
      throw new Error();
    }
  } catch (error) {
    throw new Error(`could not find file ${fileReference} in bucket ${bucket}`);
  }
  const stream = await minioClient.getObject(bucket, fileReference);
  const data = await new Promise<Buffer>((resolve, reject) => {
    let chunks: Buffer[] = [];
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("data", (chunk) => chunks.push(chunk));
  });
  return data;
}
