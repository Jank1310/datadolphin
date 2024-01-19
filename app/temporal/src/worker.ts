import { Worker } from "@temporalio/worker";
import "dotenv/config";
import { makeActivities } from "./activities";

run().catch((err) => console.log(err));

async function run() {
  const activities = makeActivities();
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"), // passed to Webpack for bundling
    activities, // directly imported in Node.js
    taskQueue: "imports", // TODO get from env
  });
  await worker.run();
}
