import initTranslations from "@/i18n/initi18n";
import { getImporterManager } from "@/lib/ImporterManager";
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
	const importerManager = await getImporterManager();
	const importerDto = await importerManager.getImporterDto(importerId);
	const pageForState = getPageForState(importerDto);
	if (pageForState !== "closed") {
		return redirect(pageForState);
	}

	return (
		<div className="w-full h-full flex items-center justify-center">
			<div className="flex flex-col items-center">
				<CheckCircleIcon className="text-green-500 h-8 w-8" />
				<h1 className="text-lg mb-2">{t("closed.title")}</h1>
				<p className="mb-6">{t("closed.message")}</p>
			</div>
		</div>
	);
};

export default ImporterClosedPage;
