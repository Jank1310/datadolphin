import { getImporterManager } from "@/lib/ImporterManager";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug: importerId } = params;
  const importerManager = await getImporterManager();
  const importerDto = await importerManager.getImporterDto(importerId);
  return NextResponse.json(importerDto);
}
