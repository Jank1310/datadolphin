import { getImporterManager } from "@/lib/ImporterManager";
import { validateServerAuth } from "@/lib/validateAuth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: { slug: string } },
) {
	if (validateServerAuth(req) === false) {
		return NextResponse.json("Unauthorized", { status: 401 });
	}
	const { slug: importerId } = params;
	const importerManager = await getImporterManager();
	await importerManager.closeImporter(importerId);
	return NextResponse.json({});
}
