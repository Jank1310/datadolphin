"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import React from "react";
import { makeData } from "./makeData";

type Props = {
  importerDto: ImporterDto;
};

const ValidationTable = (props: Props) => {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
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
  const data: Record<string, string>[] = React.useMemo(() => makeData(), []);
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
      <Table className="relative">
        <TableHeader className="sticky top-0 z-10 bg-white">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => {
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ValidationTable;
