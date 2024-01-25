import env from "env-var";
import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: env.get("MINIO_HOST").required().asString(),
  port: 9000,
  useSSL: false,
  accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
  secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
});

export default minioClient;
