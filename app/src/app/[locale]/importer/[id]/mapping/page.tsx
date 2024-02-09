import {
  DataMappingRecommendation,
  ImporterDto,
} from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";
import SelectMappings from "./SelectMappings";

type Props = {
  params: {
    id: string;
  };
};

const MappingPage = async (props: Props) => {
  const importerId = props.params.id;
  const initialImporterDtoPromise = fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then(async (res) => (await res.json()) as ImporterDto);
  const initialDataMappingsPromise = fetch(
    `${getHost()}/api/importer/${importerId}/mappings/recommendations`,
    {
      cache: "no-cache",
    }
  ).then(
    async (res) =>
      (await res.json()).recommendations as DataMappingRecommendation[] | null
  );
  const [initialImporterDto, initialDataMappings] = await Promise.all([
    initialImporterDtoPromise,
    initialDataMappingsPromise,
  ]);
  const pageForState = getPageForState(initialImporterDto);
  if (pageForState !== "mapping") {
    return redirect(pageForState);
  }
  return (
    <div className="h-full">
      <SelectMappings
        initialImporterDto={initialImporterDto}
        initialDataMappingsRecommendations={initialDataMappings}
      />
    </div>
  );
};

export default MappingPage;
