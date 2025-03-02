import { getImporterManager } from "@/lib/ImporterManager";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: { slug: string } },
) {
	const { slug: importerId } = params;
	const importerManager = await getImporterManager();
	const page = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "0");
	const size = Number.parseInt(req.nextUrl.searchParams.get("size") ?? "100");
	const filterErrorsForColumn = req.nextUrl.searchParams.get(
		"filterErrorsForColumn",
	);
	const getRecordsResponse = await importerManager.getRecords(
		importerId,
		page,
		size,
		filterErrorsForColumn,
	);
	return NextResponse.json(getRecordsResponse);
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { slug: string } },
) {
	const { slug: importerId } = params;
	const importerManager = await getImporterManager();
	const updateData = await req.json();
	const patches = [
		{
			column: updateData.columnId,
			rowId: updateData._id,
			newValue: updateData.value,
		},
	];
	const updateResult = await importerManager.patchRecords(importerId, patches);
	return NextResponse.json(updateResult);
}
