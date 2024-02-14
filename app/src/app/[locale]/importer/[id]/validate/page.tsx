import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { fetchRecords } from "@/components/hooks/useFetchRecords";
import { fetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";
import Validation from "./Validation";

export default async function page(props: { params: { id: string } }) {
  const importerId = props.params.id;
  const initialImporterDtoPromise = fetchWithAuth(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json() as Promise<ImporterDto>);
  const initialRecordsPromise = fetchRecords(importerId, 0, 100);
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
