import {
  DataMappingRecommendation,
  ImporterDto,
} from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import { redirect } from "next/navigation";
import ShowMappings from "./ShowMappings";

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
  if (initialImporterDto.status.isWaitingForFile) {
    return redirect("import");
  }
  return (
    <div className="h-full">
      <ShowMappings
        initialImporterDto={initialImporterDto}
        initialDataMappingsRecommendations={initialDataMappings}
      />
    </div>
  );
};

export default MappingPage;
