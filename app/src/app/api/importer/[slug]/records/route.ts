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

  // TODO validate access or so :)
  const records = await db
    .collection("data")
    .find()
    .skip(page * size)
    .limit(size)
    .toArray();
  return NextResponse.json({ records });
}
