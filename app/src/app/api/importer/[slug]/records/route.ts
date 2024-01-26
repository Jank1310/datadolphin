import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongoClient";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const url = new URL(req.url);
  const { slug: importerId } = params;
  const db = await getDb(importerId);
  const page = parseInt(url.searchParams.get("page") ?? "0");
  const size = parseInt(url.searchParams.get("size") ?? "100");

  // TODO validate access or so :)
  const records = await db
    .collection("data")
    .find()
    .skip(page * size)
    .limit(size)
    .toArray();
  return NextResponse.json({ records });
}
