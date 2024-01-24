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
    if (res.status === 404) return Promise.resolve([]);
    return res.json() as Promise<DataValidation[]>;
  });
  const initialSourceDataPromise = fetch(
    //! cached
    `${getHost()}/api/importer/${importerId}/source-data`
  ).then((res) => res.json() as Promise<SourceData[]>);
  const [
    initialImporterDto,
    initialPatches,
    initialValidation,
    initialSourceData,
  ] = await Promise.all([
    initialImporterDtoPromise,
    initialPatchesPromise,
    initialValidationPromise,
    initialSourceDataPromise,
  ]);
  return (
    <div className="p-4">
      <Validation
        initialImporterDto={initialImporterDto}
        initialPatches={initialPatches}
        initialValidation={initialValidation}
        initialSourceData={initialSourceData}
      />
    </div>
  );
}
