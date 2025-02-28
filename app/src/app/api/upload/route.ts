import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { getImporterManager } from "@/lib/ImporterManager";
import { getMinioClient } from "../../../lib/minioClient";

export async function POST(req: NextRequest) {
	const { importerId, destFileName, fileFormat, delimiter } =
		await handleFileUpload(req);
	const importerManager = await getImporterManager();
	await importerManager.addFile(
		importerId,
		destFileName,
		fileFormat,
		delimiter,
	);
	return new Response(undefined, { status: 201 });
}

async function handleFileUpload(req: NextRequest) {
	const formData = await req.formData();
	const file: File | null = formData.get("file") as unknown as File;
	const importerId = formData.get("importerId") as unknown as string;
	const delimiter = formData.get("delimiter") as unknown as string;
	const fileBuffer = Buffer.from(await file.arrayBuffer());

	if (!importerId) {
		throw new Error("importerId missing");
	}
	if (!fileBuffer) {
		throw new Error("file missing");
	}

	const bucket = process.env.BUCKET;
	const globalPrefix = process.env.BUCKET_PREFIX;
	if (!bucket) {
		throw new Error("BUCKET not set");
	}
	if (!globalPrefix) {
		throw new Error("BUCKET_PREFIX not set");
	}

	const bucketPrefix = importerId;

	const metadata = {
		"Content-Type": file.type,
		FileName: encodeURIComponent(file.name),
		ImporterId: importerId,
	};

	const destFileName = `${globalPrefix}/${bucketPrefix}/${randomUUID()}${extname(file.name)}`;
	try {
		await getMinioClient().putObject(
			bucket,
			destFileName,
			fileBuffer,
			metadata,
		);
	} catch (error) {
		console.error(error);
		throw new Error("Error uploading file");
	}
	const fileFormat = extname(file.name) === ".csv" ? "csv" : "xlsx";

	return {
		importerId,
		destFileName,
		fileFormat,
		delimiter,
	};
}
