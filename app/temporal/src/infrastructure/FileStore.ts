import Minio from "minio";

export class FileStore {
  constructor(private readonly minioClient: Minio.Client) {}

  public async getFile(bucket: string, fileReference: string): Promise<Buffer> {
    const fileStats = await this.minioClient.statObject(bucket, fileReference);
    if (!fileStats) {
      throw new Error(
        `could not find file ${fileReference} in bucket ${bucket}`
      );
    }
    const stream = await this.minioClient.getObject(bucket, fileReference);
    const data = await new Promise<Buffer>((resolve, reject) => {
      let chunks: Buffer[] = [];
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("data", (chunk) => chunks.push(chunk));
    });
    return data;
  }

  public async putFile(
    bucket: string,
    fileReference: string,
    file: Buffer
  ): Promise<void> {
    await this.minioClient.putObject(bucket, fileReference, file);
  }

  public async deleteBucket(bucket: string): Promise<void> {
    const objectStream = this.minioClient.listObjectsV2(
      bucket,
      undefined,
      true
    );
    const objects: Minio.BucketItem[] = [];
    await new Promise((resolve, reject) => {
      objectStream.on("data", function (obj) {
        objects.push(obj);
      });
      objectStream.on("error", reject);
      objectStream.on("end", resolve);
    });
    // we need to delete all objects first before we can delete the bucket
    for (const object of objects) {
      if (object.name) {
        await this.minioClient.removeObject(bucket, object.name);
      }
    }
    await this.minioClient.removeBucket(bucket);
  }
}
