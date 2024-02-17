import { getImporterManager } from "@/lib/ImporterManager";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const importerManager = await getImporterManager();
  const mappings = await req.json();
  await importerManager.updateMappings(importerId, mappings);
  return new NextResponse(undefined, {
    status: 201,
  });
}
