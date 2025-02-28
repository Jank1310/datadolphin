import { getImporterManager } from "@/lib/ImporterManager";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: { slug: string } },
) {
	const { slug: importerId } = params;
	const importerManager = await getImporterManager();
	await importerManager.resetImporter(importerId);
	return new NextResponse(null, { status: 200 });
}
