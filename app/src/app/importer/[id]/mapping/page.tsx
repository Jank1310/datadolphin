import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
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
  const initialImporterDto = (await fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json())) as ImporterDto;
  if (initialImporterDto.status.isWaitingForFile) {
    redirect("import");
  }

  return (
    <div className="p-4">
      <ShowMappings importerDto={initialImporterDto} />
    </div>
  );
};

export default MappingPage;
