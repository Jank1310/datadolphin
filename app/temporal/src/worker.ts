import { Worker } from "@temporalio/worker";
import dotenv from "dotenv";
import env from "env-var";
import * as Minio from "minio";
import { makeActivities } from "./activities";
import { FileStore } from "./infrastructure/FileStore";

dotenv.config({ debug: true });
console.log(process.env);
run().catch((err) => console.log(err));

async function run() {
  const minioClient = new Minio.Client({
    endPoint: env.get("MINIO_HOST").required().asString(),
    port: 9000,
    useSSL: false,
    accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
    secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
  });
  const fileStore = new FileStore(minioClient);

  const activities = makeActivities(fileStore);
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"), // passed to Webpack for bundling
    activities, // directly imported in Node.js
    taskQueue: "imports", // TODO get from env
  });
  await worker.run();
}
