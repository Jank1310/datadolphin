import { WorkflowClient } from "@temporalio/client";
import { randomUUID } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { OneClickBuy } from "../../../temporal/src/workflows";

export default async function startBuy(
  req: NextApiRequest,
  res: NextApiResponse<{ workflowId: string }>
) {
  const { itemId } = req.body; // TODO: validate itemId and req.method
  const client = new WorkflowClient(); // TODO get from global?
  const handle = await client.start(OneClickBuy, {
    workflowId: randomUUID(),
    taskQueue: "tutorial", // must match the taskQueue polled by Worker above
    args: [itemId],
  }); // kick off the purchase async

  res.status(200).json({ workflowId: handle.workflowId });
}
