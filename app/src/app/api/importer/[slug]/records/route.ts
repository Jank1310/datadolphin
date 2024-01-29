import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongoClient";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const db = await getDb(importerId);
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const size = parseInt(req.nextUrl.searchParams.get("size") ?? "100");
  console.log(
    "GET records",
    page,
    size,
    "from",
    page * size,
    "to",
    page * size + size
  );
  // TODO validate access or so :)
  const records = await db
    .collection("data")
    .find()
    .sort({ __sourceRowId: 1 })
    .skip(page * size)
    .limit(size)
    .toArray();
  console.log("found records", records.length, "for page", page);
  return NextResponse.json({ records });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const client = getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  console.log("got patch", await req.json());
  // CALL update for patches
  // TODO return new messages for cell and return if it whole column changed (client can reload pages and stats)
  return NextResponse.json({
    success: true,
  });
}
