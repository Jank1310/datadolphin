import { Connection, WorkflowClient } from "@temporalio/client";
import env from "env-var";
export const DEFAULT_TEMPORAL_QUEUE = "imports";

let connection: Connection;

export async function getTemporalWorkflowClient() {
	if (!connection) {
		connection = await Connection.connect({
			address: env.get("TEMPORAL_ADDRESS").default("localhost:7233").asString(),
		});
	}
	return new WorkflowClient({
		connection,
		namespace: env.get("TEMPORAL_NAMESPACE").default("default").asString(),
	});
}
