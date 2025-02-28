import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRightCircleIcon } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

type Props = {
	dialogOpen: boolean;
	onSave: (value: string) => void;
};

export const NewValueDialog = ({ dialogOpen, onSave }: Props) => {
	const { t } = useTranslation();

	const inputRef = useRef<HTMLInputElement>(null);

	const handleDialogSave = () => {
		onSave(inputRef?.current?.value as string);
	};

	return (
		<Dialog open={dialogOpen}>
			<DialogPortal>
				<DialogContent>
					<DialogTitle className="text-mauve12 m-0 text-[17px] font-medium">
						{t("newValueDialog.title")}
					</DialogTitle>
					<fieldset className="mb-[15px] flex items-center gap-5">
						<label
							className="text-violet11 w-[90px] text-right text-[15px]"
							htmlFor="value"
						>
							{t("newValueDialog.label")}
						</label>
						<input
							className="text-violet11 shadow-violet7 focus:shadow-violet8 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
							id="value"
							ref={inputRef}
						/>
					</fieldset>
					<div className="mt-[20px] flex justify-end">
						<Button onClick={handleDialogSave}>
							{t("newValueDialog.save")}
							<ChevronRightCircleIcon className="ml-2" />
						</Button>
					</div>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	);
};
