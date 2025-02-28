import env from "env-var";
import * as Minio from "minio";

let minioClient: Minio.Client;

export function getMinioClient() {
	if (!minioClient) {
		minioClient = new Minio.Client({
			endPoint: env.get("MINIO_HOST").required().asString(),
			accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
			secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
		});
	}
	return minioClient;
}
