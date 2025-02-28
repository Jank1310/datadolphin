import { getImporterManager } from "@/lib/ImporterManager";
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
	const importerManager = await getImporterManager();
	const initialImporterDtoPromise = importerManager.getImporterDto(importerId);
	const initialDataMappingsPromise =
		importerManager.getMappingRecommendations(importerId);
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
