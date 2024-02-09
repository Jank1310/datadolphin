import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";
import SelectFileUploader from "./SelectFileUploader";

type Props = {
  params: {
    id: string;
  };
};

const SelectFilePage = async (props: Props) => {
  const importerId = props.params.id;
  const initialImporterDto = (await fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
      headers: {
        Authorization: process.env.NEXT_PUBLIC_FRONTEND_TOKEN as string,
      },
    }
  ).then((res) => res.json())) as ImporterDto;
  const pageForState = getPageForState(initialImporterDto);
  if (pageForState !== "select-file") {
    return redirect(pageForState);
  }
  return (
    <div className="flex h-full items-center justify-center">
      <SelectFileUploader importerDto={initialImporterDto} />
    </div>
  );
};

export default SelectFilePage;
