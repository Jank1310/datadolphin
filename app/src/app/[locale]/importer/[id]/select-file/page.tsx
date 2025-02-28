import { getImporterManager } from "@/lib/ImporterManager";
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
	const importerManager = await getImporterManager();
	const importerDto = await importerManager.getImporterDto(importerId);
	const pageForState = getPageForState(importerDto);
	if (pageForState !== "select-file") {
		return redirect(pageForState);
	}
	return (
		<div className="flex h-full items-center justify-center">
			<SelectFileUploader importerDto={importerDto} />
		</div>
	);
};

export default SelectFilePage;
