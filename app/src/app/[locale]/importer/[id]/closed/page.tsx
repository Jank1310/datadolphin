import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import initTranslations from "@/i18n/initi18n";
import { getHost } from "@/lib/utils";
import { CheckCircleIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";

type Props = {
  params: {
    id: string;
    locale: string;
  };
};

const ImporterClosedPage = async (props: Props) => {
  const { t } = await initTranslations(props.params.locale);
  const importerId = props.params.id;
  const initialImporterDto = (await fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json())) as ImporterDto;
  const pageForState = getPageForState(initialImporterDto);
  if (pageForState !== "closed") {
    return redirect(pageForState);
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center">
        <CheckCircleIcon className="text-green-500 h-8 w-8" />
        <h1 className="text-lg mb-2">{t("importing.title")}</h1>
        <p className="mb-6">{t("importing.youCanCloseNow")}</p>
      </div>
    </div>
  );
};

export default ImporterClosedPage;
