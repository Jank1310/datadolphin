import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/mongoClient";
import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateServerAuth } from "@/lib/validateAuth";
import { ImporterStatus } from "../../importer/[slug]/ImporterDto";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateServerAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const client = getTemporalWorkflowClient();
  const { slug: importerId } = params;
  const paramLimit = req.nextUrl.searchParams.get("limit");
  const paramPage = req.nextUrl.searchParams.get("page");
  const limit = paramLimit ? parseInt(paramLimit) : 1000;
  const page = paramPage ? parseInt(paramPage) : 0;
  if (!importerId) {
    return new Response("importerId missing", { status: 500 });
  }
  const db = await getDb(importerId);
  const handle = (await client).getHandle(importerId);
  const workflowState = await handle.query<ImporterStatus>("importer:status");
  if (workflowState.state === "closed") {
    return NextResponse.json({ error: "Importer is closed" }, { status: 410 });
  }
  if (workflowState.state !== "importing") {
    return NextResponse.json(
      { error: "Importer is not in importing state" },
      { status: 410 }
    );
  }
  const total = await db.collection("data").countDocuments({});
  const totalPages = Math.ceil(total / Number(limit));
  const records = await db
    .collection("data")
    .find()
    .skip(Number(page) * Number(limit))
    .limit(Number(limit))
    .toArray();
  console.log("recoreds", records, limit, page);
  return NextResponse.json({
    records,
    pages: totalPages,
    total: total,
  });
}
