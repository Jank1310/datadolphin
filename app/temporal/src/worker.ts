import { NativeConnection, Worker } from "@temporalio/worker";
import dotenv from "dotenv";
import env from "env-var";
import * as Minio from "minio";
import { MongoClient } from "mongodb";
import { makeActivities } from "./activities";
import { DataAnalyzer } from "./domain/DataAnalyzer";
import { Database } from "./infrastructure/Database";
import { FileStore } from "./infrastructure/FileStore";

dotenv.config({ debug: true });
run().catch((err) => console.error(err));

async function run() {
	const minioClient = new Minio.Client({
		endPoint: env.get("MINIO_HOST").required().asString(),
		accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
		secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
	});
	const mongoClient = await new MongoClient(
		env.get("MONGO_URL").required().asString(),
	).connect();
	const fileStore = new FileStore(
		minioClient,
		env.get("BUCKET").required().asString(),
		env.get("BUCKET_PREFIX").required().asString(),
	);
	const database = new Database(mongoClient);
	const dataAnalyzer = new DataAnalyzer();
	const activities = makeActivities(fileStore, database, dataAnalyzer);
	const nativeConnection = await NativeConnection.connect({
		address: env.get("TEMPORAL_ADDRESS").default("localhost:7233").asString(),
	});
	const worker = await Worker.create({
		connection: nativeConnection,
		namespace: env.get("TEMPORAL_NAMESPACE").default("default").asString(),
		workflowsPath: require.resolve("./workflows"), // passed to Webpack for bundling
		activities, // directly imported in Node.js
		taskQueue: "imports", // TODO get from env
	});
	await worker.run();
}
