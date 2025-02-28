import type { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";

export function getPageForState(importerDto: ImporterDto) {
	const { state } = importerDto.status;
	switch (state) {
		case "select-file":
			return "select-file";
		case "mapping":
			return "mapping";
		case "validate":
			return "validate";
		case "importing":
			return "importing";
		case "closed":
			return "closed";
		default:
			throw new Error(`Unknown state: ${state}`);
	}
}
