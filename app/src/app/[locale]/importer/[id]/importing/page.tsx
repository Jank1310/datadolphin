import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import initTranslations from "@/i18n/initi18n";
import { getHost } from "@/lib/utils";

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
      cache: "no-cache",
    }
  ).then(async (res) => (await res.json()) as ImporterDto);
  const initialImporterDto = await initialImporterDtoPromise;
  return (
    <div>
      <h1>{t("importing.title")}</h1>
    </div>
  );
};

export default ImportingPage;
