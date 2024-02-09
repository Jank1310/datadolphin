import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { Button } from "@/components/ui/button";
import initTranslations from "@/i18n/initi18n";
import { getHost } from "@/lib/utils";
import { ZapIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getPageForState } from "../redirectUtil";

type Props = {
  params: {
    id: string;
    locale: string;
  };
};

const ImportingPage = async (props: Props) => {
  const { t } = await initTranslations(props.params.locale);
  const importerId = props.params.id;
  const initialImporterDtoPromise = fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_FRONTEND_TOKEN as string,
      },
      cache: "no-cache",
    }
  ).then(async (res) => (await res.json()) as ImporterDto);

  const initialImporterDto = await initialImporterDtoPromise;
  const page = getPageForState(initialImporterDto);
  if (page !== "importing") {
    return redirect(page);
  }

  const redirectUrl = initialImporterDto.config.redirectUrl;
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center">
        <ZapIcon className="text-slate-400 animate-pulse h-8 w-8" />
        <h1 className="text-lg mb-2">{t("importing.title")}</h1>
        <p className="mb-6">{t("importing.youCanCloseNow")}</p>
        {Boolean(redirectUrl) && (
          <Button asChild>
            <a href="https://google.com">{t("importing.backToTargetApp")}</a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImportingPage;
