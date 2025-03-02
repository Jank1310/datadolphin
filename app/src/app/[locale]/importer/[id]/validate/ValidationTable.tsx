"use client";
import type {
	EnumerationColumnValidation,
	ImporterDto,
	SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import {
	type Row,
	type RowData,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { produce } from "immer";
import { isObject, isString } from "lodash";
import { AlertCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { InputCell } from "./cells/InputCell";
import SelectCell from "./cells/SelectCell";

type Props = {
	importerDto: ImporterDto;
	data: Record<number, SourceData[]>;
	totalRows: number;
	onUpdateData: (
		rowIndex: number,
		rowId: string,
		columnId: string,
		value: string | string[] | number | null,
		previousValue: string | string[] | number | null,
	) => void;
	onLoadPage: (page: number, force: boolean) => void;
	currentValidations: Record<
		string /* rowId */,
		Record<string /* columnId */, boolean>
	>;
	onReloadConfig: VoidFunction;
	onFilterErrorsForColumn: (columnId: string) => void;
};

type ExtendedSourceData = SourceData & {
	isValidatingByColumn?: Record<string /* columnId */, boolean>;
};

declare module "@tanstack/react-table" {
	interface TableMeta<TData extends RowData> {
		updateData: (
			rowIndex: number,
			columnId: string,
			value: string | string[] | number | null,
			previousValue: string | string[] | number | null,
		) => void;
	}
}

const ValidationTable = (props: Props) => {
	const { t } = useTranslation();
	const { importerId } = props.importerDto;
	const { onReloadConfig, onFilterErrorsForColumn } = props;
	const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
	const tableBodyRef = React.useRef<HTMLTableSectionElement | null>(null);
	const columns = React.useMemo(() => {
		const dataMappingWithConfig = (props.importerDto.status.dataMapping ?? [])
			.filter((mapping) => mapping.targetColumn !== null)
			.map((mapping) => {
				const config = props.importerDto.config.columnConfig.find(
					(c) => c.key === mapping.targetColumn,
				);
				if (!config) {
					throw new Error("Config not found for mapping");
				}
				return { ...mapping, config };
			});
		const columnHelper = createColumnHelper<ExtendedSourceData | "loading">();
		return dataMappingWithConfig.map(({ targetColumn, config }) =>
			columnHelper.accessor(`data.${config.key}.value`, {
				header: config.label,
				id: config.key,
				size: 300,
				cell: (props) => {
					const mapperColumnId = config.key;
					const value = props.getValue();
					if (!value && isString(value) === false) {
						return (
							<div className="h-[36px] p-2 flex items-center justify-center">
								<Skeleton className="h-4 w-full" />
							</div>
						);
					}
					const originalRecord = props.row.original;
					const allMessagesForCell = isObject(originalRecord)
						? (originalRecord.data?.[mapperColumnId]?.messages ?? [])
						: [];
					const columnValidations = config.validations ?? [];
					const isValidating = isObject(originalRecord)
						? originalRecord.isValidatingByColumn?.[mapperColumnId] === true
						: false;
					const enumValidators = columnValidations.filter(
						(validation) => validation.type === "enum",
					) as EnumerationColumnValidation[];
					const isValueRequired = columnValidations.some(
						(validation) => validation.type === "required",
					);
					let displayValue: React.ReactNode = value;
					const handleChangeData = (newValue: string | string[]) => {
						props.table.options.meta?.updateData(
							props.row.index,
							mapperColumnId,
							newValue,
							value,
						);
					};
					if (enumValidators && enumValidators.length > 0) {
						const availableValues = enumValidators.flatMap(
							(validator) => validator.values,
						);
						const canAddNewValues = enumValidators.some(
							(validator) => validator.canAddNewValues === true,
						);
						const multi = config.multipleValues?.enabled ?? false;
						if (multi && Array.isArray(value) === false) {
							throw new Error("Expected value to be an array");
						}

						displayValue = (
							<SelectCell
								multi={multi}
								value={multi ? (value as string[]) : ((value as string) ?? "")}
								availableValues={availableValues}
								configKey={config.key}
								importerId={importerId}
								onChange={handleChangeData}
								isRequired={isValueRequired}
								isReadOnly={isValidating}
								onReloadConfig={onReloadConfig}
								canAddNewValues={canAddNewValues}
							/>
						);
					} else if (config.type === "text") {
						displayValue = (
							<InputCell
								value={(value as string) ?? ""}
								isRequired={isValueRequired}
								isReadOnly={isValidating}
								onChange={handleChangeData}
							/>
						);
					}

					return (
						<div
							className={cn("flex items-center h-9", {
								"bg-slate-200 animate-pulse": isValidating,
							})}
						>
							{displayValue}
							{allMessagesForCell.length > 0 && (
								<Tooltip delayDuration={0}>
									<TooltipTrigger>
										<AlertCircle className="ml-2 text-red-500 size-5" />
									</TooltipTrigger>
									<TooltipPortal>
										<TooltipContent collisionBoundary={tableBodyRef.current}>
											{allMessagesForCell.map((message, index) => (
												<div
													key={`message-${
														// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
														index
													}`}
												>
													{t(`validation.messages.${message.type}`)}
												</div>
											))}
										</TooltipContent>
									</TooltipPortal>
								</Tooltip>
							)}
						</div>
					);
				},
			}),
		);
	}, [
		importerId,
		onReloadConfig,
		props.importerDto.config.columnConfig,
		props.importerDto.status.dataMapping,
		t,
	]);

	const allEmptyData: ExtendedSourceData[] = React.useMemo(() => {
		const emptyRowEntry = props.importerDto.config.columnConfig.reduce(
			(acc, config) => {
				acc.data[config.key] = { value: null, messages: [] };
				return acc;
			},
			{ data: {} } as ExtendedSourceData,
		);
		return new Array(props.totalRows).fill(emptyRowEntry);
	}, [props.importerDto.config.columnConfig, props.totalRows]);
	const allData = React.useMemo(() => {
		// TODO find better way
		return produce(allEmptyData, (draft) => {
			// insert all page data
			for (const pageNumber of Object.keys(props.data).map((k) =>
				Number.parseInt(k),
			)) {
				const start = pageNumber * 100;
				const pageData = props.data[pageNumber];
				for (let i = 0; i < pageData.length; i++) {
					const currentValidationsForRow =
						props.currentValidations[pageData[i]._id];
					draft[start + i] = { ...pageData[i] };
					draft[start + i].isValidatingByColumn =
						currentValidationsForRow ?? {};
				}
			}
		});
	}, [allEmptyData, props.currentValidations, props.data]);
	const table = useReactTable({
		data: allData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		meta: {
			updateData: (rowIndex, columnId, value, previousValue) => {
				const rowId = allData[rowIndex]._id;
				props.onUpdateData(rowIndex, rowId, columnId, value, previousValue);
			},
		},
	});

	const rowVirtualizer = useVirtualizer({
		count: props.totalRows,
		estimateSize: () => 36, //estimate row height for accurate scrollbar dragging
		getScrollElement: () => tableContainerRef.current,
		//measure dynamic row height, except in firefox because it measures table border height incorrectly
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	const { onLoadPage, data } = props;
	const virtualItems = rowVirtualizer.getVirtualItems();
	React.useEffect(() => {
		if (!virtualItems || virtualItems.length === 0) {
			return;
		}
		const firstItem = virtualItems[0];
		const lastItem = virtualItems[virtualItems.length - 1];
		if (firstItem) {
			const pageOfFirstItem = Math.floor(firstItem.index / 100);
			if (pageOfFirstItem in data === false) {
				onLoadPage(pageOfFirstItem, false);
			}
		}
		if (lastItem) {
			const pageOfLastItem = Math.floor(lastItem.index / 100);
			if (pageOfLastItem in data === false) {
				onLoadPage(pageOfLastItem, false);
			}
		}
	}, [data, onLoadPage, virtualItems]);

	const { rows } = table.getRowModel();
	return (
		<div
			className="rounded-md overflow-auto border h-[calc(100vh_-_4.5rem)]"
			ref={tableContainerRef}
		>
			<TooltipProvider>
				<Tooltip>
					<Table className="relative">
						<TableHeader className="sticky top-0 z-10 bg-white">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="flex w-full">
									{headerGroup.headers.map((header) => {
										const numberOfMessages =
											props.importerDto.status.meta?.messageCount[
												header.column.id
											] ?? 0;
										return (
											<TableHead
												className="border-r"
												key={header.id}
												style={{
													width: header.getSize(),
												}}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
												{numberOfMessages > 0 && (
													<Badge
														className="ml-4 bg-destructive text-destructive-foreground cursor-pointer"
														onClick={() =>
															onFilterErrorsForColumn(header.column.id)
														}
													>
														{t("validation.numberOfErrors", {
															count: numberOfMessages,
														})}
													</Badge>
												)}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody
							ref={tableBodyRef}
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
							}}
						>
							{rowVirtualizer.getVirtualItems().map((virtualRow) => {
								const hasLoadedRow = rows[virtualRow.index] !== undefined;
								if (!hasLoadedRow) {
									return (
										<TableRow
											className="absolute w-full flex"
											style={{
												transform: `translateY(${virtualRow.start}px)`,
											}}
											key={`loading-${virtualRow.index}`}
										/>
									);
								}
								const row = rows[virtualRow.index] as Row<unknown>;

								return (
									<TableRow
										className="absolute w-full flex"
										style={{
											transform: `translateY(${virtualRow.start}px)`,
										}}
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => {
											return (
												<TableCell
													className="border-r overflow-hidden"
													key={cell.id}
													style={{
														width: cell.column.getSize(),
													}}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
};

export default ValidationTable;
