import type Minio from "minio";

export class FileStore {
	constructor(
		private readonly minioClient: Minio.Client,
		private readonly bucket: string,
		private readonly globalPrefix: string,
	) {}

	private getPath(prefix: string, file: string) {
		return `${this.globalPrefix}/${prefix}/${file}`;
	}

	public async getFile(fileReference: string): Promise<Buffer> {
		const fileStats = await this.minioClient.statObject(
			this.bucket,
			fileReference,
		);
		if (!fileStats) {
			throw new Error(
				`could not find file ${fileReference} in bucket ${this.bucket} `,
			);
		}
		const stream = await this.minioClient.getObject(this.bucket, fileReference);
		const data = await new Promise<Buffer>((resolve, reject) => {
			const chunks: Buffer[] = [];
			stream.on("error", reject);
			stream.on("end", () => resolve(Buffer.concat(chunks)));
			stream.on("data", (chunk) => chunks.push(chunk));
		});
		return data;
	}

	public async putFile(fileReference: string, file: Buffer): Promise<void> {
		await this.minioClient.putObject(this.bucket, fileReference, file);
	}

	public async deleteFilesInPrefix(prefix: string): Promise<void> {
		const objectStream = this.minioClient.listObjectsV2(
			this.bucket,
			`${this.globalPrefix}/${prefix}`,
			true,
		);
		const objects: Minio.BucketItem[] = [];
		await new Promise((resolve, reject) => {
			objectStream.on("data", (obj) => {
				objects.push(obj);
			});
			objectStream.on("error", reject);
			objectStream.on("end", resolve);
		});
		// we need to delete all objects first before we can delete the bucket
		for (const object of objects) {
			if (object.name) {
				await this.deleteFile(this.bucket, object.name);
			}
		}
	}

	public async deleteFile(
		prefix: string,
		fileReference: string,
	): Promise<void> {
		await this.minioClient.removeObject(this.bucket, fileReference);
	}
}
