"use client";
import {
  DataSetPatch,
  DataValidation,
  ImporterDto,
  SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { groupBy } from "lodash";
import React from "react";

type Props = {
  importerDto: ImporterDto;
  data: SourceData[];
  validations: DataValidation[];
  patches: DataSetPatch[];
};

const ValidationTable = (props: Props) => {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  // TODO use helper to define columns and headers?
  // https://tanstack.com/table/v8/docs/guide/column-defs
  const columns: ColumnDef<any>[] = React.useMemo(
    () =>
      props.importerDto.config.columnConfig.map(
        (config) =>
          ({
            accessorKey: config.key,
            header: config.label,
            size: 300,
          } as ColumnDef<any>)
      ),
    [props.importerDto.config.columnConfig]
  );
  const data = React.useMemo(() => {
    // TODO merge with patches
    return props.data;
  }, [props.data]);

  const validationsByColumn = React.useMemo(() => {
    return groupBy(props.validations, "column");
  }, [props.validations]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    estimateSize: () => 52.5, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });
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
                    const numberOfValidations =
                      validationsByColumn[header.id]?.length ?? 0;
                    return (
                      <TableHead
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
                      const validationsForCell = props.validations.filter(
                        (validation) =>
                          validation.rowId === parseInt(row.id) &&
                          validation.column === cell.column.id
                      );
                      const allErrors = validationsForCell.flatMap(
                        (validation) => validation.errors
                      );
                      const hasErrors = allErrors.length > 0;
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                          }}
                          className={cn({
                            "text-red-500 bg-red-200": hasErrors,
                          })}
                        >
                          {flexRender(cell.column.columnDef.cell, {
                            ...cell.getContext(),
                            allErrors,
                          })}
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
