import { WorkflowClient } from "@temporalio/client";

export const DEFAULT_TEMPORAL_QUEUE = "imports";

export const getTemporalWorkflowClient = () => {
  // TODO get options from env
  return new WorkflowClient({});
};
