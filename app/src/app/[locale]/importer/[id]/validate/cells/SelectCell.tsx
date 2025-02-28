import {
	Combobox,
	ComboboxAnchor,
	ComboboxBadgeItem,
	ComboboxBadgeList,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
} from "@/components/ui/combobox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
} from "@/components/ui/select";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { isShallowEqual } from "remeda";
import { NewValueDialog } from "../NewValueDialog";

type Props = {
	multi: boolean;
	value: string | string[];
	onChange: (value: string | string[]) => void;
	isRequired: boolean;
	availableValues: string[];
	isReadOnly: boolean;
	configKey: string;
	importerId: string;
	onReloadConfig: VoidFunction;
	canAddNewValues?: boolean;
};

const SelectCellTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			"flex w-full items-center justify-between text-sm",
			className,
		)}
		{...props}
	>
		<span>{children}</span>
		<SelectPrimitive.Icon asChild>
			<ChevronDown className="h-4 w-4 opacity-50" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectCellTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectCell = ({
	value: initialValue,
	onChange,
	isRequired,
	availableValues,
	isReadOnly,
	configKey,
	importerId,
	onReloadConfig,
	canAddNewValues,
	multi,
}: Props) => {
	const { t } = useTranslation();
	const id = useId();
	const frontendFetch = useFrontendFetchWithAuth();
	const [value, setValue] = React.useState<string | string[]>(initialValue);
	const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

	React.useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);
	const normalizedString = (value as string) ?? "";
	const isValueEmpty = normalizedString === "";

	const handleDialogSave = async (value: string) => {
		if (!value) {
			setDialogOpen(false);
			return;
		}
		// use settimeout to get a snappier experience
		setTimeout(() => onChange(value));
		setValue(value);
		await frontendFetch(
			`/api/importer/${importerId}/columnConfig/${configKey}/validations`,
			{
				method: "PATCH",
				body: JSON.stringify({
					type: "enum",
					values: [...new Set([...availableValues, value])],
				}),
			},
		);
		onReloadConfig();
		setDialogOpen(false);
	};
	if (multi && Array.isArray(value)) {
		return (
			<Combobox
				className="w-full h-full"
				value={value}
				onValueChange={(newValue: string[]) => {
					if (!isShallowEqual(value, newValue)) {
						// use settimeout to get a snappier experience
						setTimeout(() => onChange(newValue));
					}
					setValue(newValue);
				}}
				multiple
				autoHighlight
				openOnFocus
			>
				<ComboboxAnchor className="w-full h-full flex-nowrap border-none p-2 outline-none">
					<ComboboxBadgeList className="shrink-0">
						{value.map((item) => {
							const option = availableValues.find((v) => v === item);
							if (!option)
								return (
									<ComboboxBadgeItem
										key={item}
										value={item}
										className="bg-destructive text-destructive-foreground font-semibold"
									>
										{item}
									</ComboboxBadgeItem>
								);

							return (
								<ComboboxBadgeItem className="" key={item} value={item}>
									{option}
								</ComboboxBadgeItem>
							);
						})}
					</ComboboxBadgeList>
					<ComboboxInput
						placeholder="Search"
						className="text-gray-400 h4 outline-none"
					/>
					<ComboboxTrigger className="absolute right-1">
						<ChevronDown className="h-4 w-4" />
					</ComboboxTrigger>
				</ComboboxAnchor>
				<ComboboxContent>
					{availableValues.map((availableValue) => (
						<ComboboxItem key={availableValue} value={availableValue}>
							{availableValue}
						</ComboboxItem>
					))}
				</ComboboxContent>
			</Combobox>
		);
	}

	return (
		<>
			<Select
				disabled={isReadOnly}
				value={normalizedString === "" ? "none" : normalizedString}
				onValueChange={(newValue) => {
					const normalizedNewValue = newValue === "none" ? "" : newValue;
					if (value !== normalizedNewValue) {
						if (normalizedNewValue === "$$new") {
							setDialogOpen(true);
							return;
						}
						// use settimeout to get a snappier experience
						setTimeout(() => onChange(normalizedNewValue));
					}
					setValue(newValue);
				}}
			>
				<SelectCellTrigger
					className={cn("p-2", {
						"text-gray-400": isValueEmpty,
					})}
				>
					{isValueEmpty ? t("validation.none") : value}
				</SelectCellTrigger>
				<SelectContent>
					{!isRequired && (
						<SelectItem className="text-gray-400" value={"none"}>
							{t("validation.none")}
						</SelectItem>
					)}
					{availableValues.map((selectableValue) => (
						<SelectItem
							value={selectableValue}
							key={`enum-value-${id}-${selectableValue}`}
						>
							{selectableValue}
						</SelectItem>
					))}
					{canAddNewValues && (
						<>
							<SelectSeparator />
							<SelectItem value="$$new" key={`enum-value-${id}-new`}>
								{t("validation.selectCellAddNewValue")}
							</SelectItem>
						</>
					)}
				</SelectContent>
			</Select>
			<NewValueDialog dialogOpen={dialogOpen} onSave={handleDialogSave} />
		</>
	);
};

export default SelectCell;
