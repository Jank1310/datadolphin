import { getImporterManager } from "@/lib/ImporterManager";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";
import Validation from "./Validation";

export default async function page(props: { params: { id: string } }) {
  const importerId = props.params.id;
  const importerManager = await getImporterManager();
  const initialImporterDtoPromise = importerManager.getImporterDto(importerId);
  const initialRecordsPromise = importerManager.getRecords(importerId, 0, 100);
  const [initialImporterDto, initialRecords] = await Promise.all([
    initialImporterDtoPromise,
    initialRecordsPromise,
  ]);

  const pageForState = getPageForState(initialImporterDto);
  if (pageForState !== "validate") {
    return redirect(pageForState);
  }
  return (
    <div className="h-full">
      <Validation
        initialImporterDto={initialImporterDto}
        initialRecords={initialRecords}
      />
    </div>
  );
}
