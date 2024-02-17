import { getImporterManager } from "@/lib/ImporterManager";
import { validateAuth } from "@/lib/validateAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (validateAuth(req) === false) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
  const { slug: importerId } = params;
  const importerManager = await getImporterManager();
  try {
    const recommendations = await importerManager.getMappingRecommendations(
      importerId
    );
    return NextResponse.json({ recommendations });
  } catch (err) {
    if ((err as Error).message === "Importer is closed") {
      return NextResponse.json("Importer is closed", { status: 400 });
    } else {
      throw err;
    }
  }
}
