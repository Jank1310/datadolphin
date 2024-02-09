import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";

export function getPageForState(importerDto: ImporterDto) {
  const { state } = importerDto.status;
  if (state === "select-file") {
    return "select-file";
  }
  if (state === "mapping") {
    return "mapping";
  }
  if (state === "validate") {
    return "validate";
  }
  if (state === "importing") {
    return "importing";
  }
  if (state === "closed") {
    return "closed";
  }
  throw new Error(`Unknown state: ${state}`);
}
