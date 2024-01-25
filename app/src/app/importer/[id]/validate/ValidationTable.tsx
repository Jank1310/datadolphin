"use client";
import {
  DataValidation,
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
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  Row,
  RowData,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, Badge } from "lucide-react";
import React from "react";
import { InputCell } from "./cells/InputCell";
import SelectCell from "./cells/SelectCell";

type Props = {
  importerDto: ImporterDto;
  data: Record<number, SourceData[]>; // TODO pass data by page number {1:[...], 2:[...]}
  totalRows: number;
  validations: DataValidation[];
  onUpdateData: (
    rowIndex: number,
    columnId: string,
    value: string | number | null,
    previousValue: string | number | null
  ) => void;
  onLoadPage: (page: number) => void;
};

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    updateData: (
      rowIndex: number,
      columnId: string,
      value: string | number | null,
      previousValue: string | number | null
    ) => void;
  }
}

const ValidationTable = (props: Props) => {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<SourceData | "loading">();
    return props.importerDto.config.columnConfig.map((config) =>
      columnHelper.accessor(config.key, {
        header: config.label,
        size: 300,
        cell: (props) => {
          const value = props.getValue();
          if (value === "loading") {
            return <div>Loading...</div>;
          }
          const allErrorsForCell = [];
          const columnValidations = config.validations ?? [];
          const enumValidators = columnValidations.filter(
            (validation) => validation.type === "enum"
          ) as EnumerationColumnValidation[];
          const isValueRequired = columnValidations.some(
            (validation) => validation.type === "required"
          );
          let displayValue: React.ReactNode = value;
          if (enumValidators && enumValidators.length > 0) {
            const handleChangeMapping = (newValue: string) => {
              props.table.options.meta?.updateData(
                props.row.index,
                config.key,
                newValue,
                value
              );
            };
            const availableValues = enumValidators.flatMap(
              (validator) => validator.values
            );
            displayValue = (
              <SelectCell
                value={(value as string) ?? ""}
                availableValues={availableValues}
                onChange={handleChangeMapping}
                isRequired={isValueRequired}
              />
            );
          } else if (config.type === "text") {
            displayValue = (
              <InputCell
                value={(value as string) ?? ""}
                isRequired={isValueRequired}
                onChange={(newValue) =>
                  props.table.options.meta?.updateData(
                    props.row.index,
                    props.cell.id,
                    newValue,
                    value
                  )
                }
              />
            );
          }

          return (
            <div className="flex items-center p-2">
              {displayValue}
              {/* TODO show tooltip */}
              {allErrorsForCell.length > 0 && (
                <AlertCircle className="ml-2 text-red-500 size-5" />
              )}
            </div>
          );
        },
      })
    );
  }, [props.importerDto.config.columnConfig]);

  const allData = React.useMemo(() => {
    const dataWithNulls: (SourceData | "loading")[] = new Array(
      props.totalRows
    ).fill("loading");
    // insert all page data
    for (const pageNumber of Object.keys(props.data).map((k) => parseInt(k))) {
      const start = pageNumber * 100;
      const pageData = props.data[pageNumber];
      for (let i = 0; i < pageData.length; i++) {
        dataWithNulls[start + i] = pageData[i];
      }
    }
    return dataWithNulls;
  }, [props.data, props.totalRows]);

  const table = useReactTable({
    data: allData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateData: props.onUpdateData,
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
    console.log("update");
    if (!virtualItems || virtualItems.length === 0) {
      return;
    }
    const firstItem = virtualItems[0];
    const lastItem = virtualItems[virtualItems.length - 1];
    if (firstItem) {
      const pageOfFirstItem = Math.floor(firstItem.index / 100);
      if (pageOfFirstItem in data === false) {
        onLoadPage(pageOfFirstItem);
      }
    }
    if (lastItem) {
      const pageOfLastItem = Math.floor(lastItem.index / 100);
      if (pageOfLastItem in data === false) {
        onLoadPage(pageOfLastItem);
      }
    }
  }, [data, onLoadPage, virtualItems]);

  const { rows } = table.getRowModel();
  return (
    <div
      className="rounded-md overflow-auto border h-[80vh]"
      ref={tableContainerRef}
    >
      <TooltipProvider>
        <Tooltip>
          <Table className="relative">
            <TableHeader className="sticky top-0 z-10 bg-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="flex w-full">
                  {headerGroup.headers.map((header) => {
                    const numberOfValidations = 0;
                    return (
                      <TableHead
                        className="border-r"
                        key={header.id}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {numberOfValidations > 0 && (
                          <Badge className="ml-4 bg-red-500">
                            {numberOfValidations} errors
                          </Badge>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
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
                    >
                      Empty
                    </TableRow>
                  );
                }
                const row = rows[virtualRow.index] as Row<any>;

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
                      // const validationsForCell = props.validations.filter(
                      //   (validation) =>
                      //     validation.rowId === parseInt(row.id) &&
                      //     validation.column === cell.column.id
                      // );
                      // const allErrors = validationsForCell.flatMap(
                      //   (validation) => validation.errors
                      // );
                      // const hasErrors = allErrors.length > 0;
                      return (
                        <TableCell
                          className="border-r"
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
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
