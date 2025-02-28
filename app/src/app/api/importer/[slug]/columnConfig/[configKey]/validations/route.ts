import { getImporterManager } from "@/lib/ImporterManager";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { slug: string; configKey: string } },
) {
	const { slug: importerId, configKey } = params;
	const importerManager = await getImporterManager();
	const validation = await req.json();

	await importerManager.updateColumnValidation(
		importerId,
		configKey,
		validation,
	);
	return NextResponse.json({});
}
