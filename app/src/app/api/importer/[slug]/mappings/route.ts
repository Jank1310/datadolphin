import { getImporterManager } from "@/lib/ImporterManager";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const importerManager = await getImporterManager();
  const mappings = await req.json();
  await importerManager.updateMappings(importerId, mappings);
  return new NextResponse(undefined, {
    status: 201,
  });
}
