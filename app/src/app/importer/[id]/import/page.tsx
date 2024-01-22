import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import ImportPage from "./ImportPage";

type Props = {
  params: {
    id: string;
  };
};

const ImportDataPage = async (props: Props) => {
  const importerId = props.params.id;
  const initialImporterDto = (await fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json())) as ImporterDto;
  return <ImportPage importerDto={initialImporterDto} />;
};

export default ImportDataPage;
