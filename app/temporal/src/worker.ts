import { Worker } from "@temporalio/worker";
import dotenv from "dotenv";
import env from "env-var";
import * as Minio from "minio";
import { MongoClient } from "mongodb";
import { makeActivities } from "./activities";
import { DataAnalyzer } from "./domain/DataAnalyzer";
import { Database } from "./infrastructure/Database";
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
  const mongoClient = await new MongoClient(
    env.get("MONGO_URL").required().asString()
  ).connect();
  const fileStore = new FileStore(minioClient);
  const database = new Database(mongoClient);
  const dataAnalyzer = new DataAnalyzer();
  const activities = makeActivities(fileStore, database, dataAnalyzer);
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"), // passed to Webpack for bundling
    activities, // directly imported in Node.js
    taskQueue: "imports", // TODO get from env
  });
  await worker.run();
}
