import { getTemporalWorkflowClient } from "@/lib/temporalClient";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongoClient";
import { DataSetPatch } from "../ImporterDto";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const db = await getDb(importerId);
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  const size = parseInt(req.nextUrl.searchParams.get("size") ?? "100");
  // TODO validate access or so :)
  const records = await db
    .collection("data")
    .find()
    .sort({ __sourceRowId: 1 })
    .skip(page * size)
    .limit(size)
    .toArray();
  return NextResponse.json({ records });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const client = await getTemporalWorkflowClient();
  const handle = client.getHandle(importerId);
  const updateData = await req.json();
  const updateResult = await handle.executeUpdate<
    {
      changedColumns: string[];
      newMessages: Record<string, any[]>;
    },
    [{ patches: DataSetPatch[] }]
  >("importer:update-record", {
    args: [
      {
        patches: [
          {
            column: updateData.columnId,
            rowId: updateData._id,
            newValue: updateData.value,
          },
        ],
      },
    ],
  });
  // CALL update for patches
  // TODO return new messages for cell and return if it whole column changed (client can reload pages and stats)
  return NextResponse.json(updateResult);
}
