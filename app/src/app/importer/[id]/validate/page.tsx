import {
  DataSetPatch,
  DataValidation,
  ImporterDto,
  SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import Validation from "./Validation";

export default async function page(props: { params: { id: string } }) {
  const importerId = props.params.id;
  console.time("page start");
  const initialImporterDtoPromise = fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json() as Promise<ImporterDto>);
  const initialPatchesPromise = fetch(
    `${getHost()}/api/importer/${importerId}/patches`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json() as Promise<DataSetPatch[]>);
  const initialValidationPromise = fetch(
    `${getHost()}/api/importer/${importerId}/validations`,
    {
      cache: "no-cache",
    }
  ).then((res) => {
    if (res.status === 404) {
      return Promise.resolve([]);
    }
    return res.json() as Promise<DataValidation[]>;
  });
  const initialSourceDataPromise = fetch(
    //! cached
    `${getHost()}/api/importer/${importerId}/source-data`
  ).then((res) => res.json() as Promise<SourceData[]>);
  const [initialImporterDto, initialValidation, initialSourceData] =
    await Promise.all([
      initialImporterDtoPromise,
      initialValidationPromise,
      initialSourceDataPromise,
    ]);
  console.timeEnd("page start");
  return (
    <div className="p-4">
      <Validation
        initialImporterDto={initialImporterDto}
        initialValidation={initialValidation}
        initialSourceData={initialSourceData}
      />
    </div>
  );
}
