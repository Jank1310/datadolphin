"use client";

import { ImporterDto, SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { useFetchRecords } from "@/components/hooks/useFetchRecords";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { Button } from "@/components/ui/button";
import { enableMapSet } from "immer";
import { ChevronRightCircleIcon } from "lucide-react";
import React from "react";
import ValidationTable from "./ValidationTable";
enableMapSet();
type Props = {
  initialImporterDto: ImporterDto;
  initialRecords: SourceData[];
};

const Validation = ({
  initialImporterDto,
  initialRecords: initialData,
}: Props) => {
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    undefined,
    initialImporterDto
  );
  const [currentlyLoading, setCurrentlyLoading] = React.useState<
    Record<string, boolean>
  >({});
  const [pageData, setPageData] = React.useState<Record<number, SourceData[]>>({
    0: initialData,
  });
  const fetchRecords = useFetchRecords(initialImporterDto.importerId);

  const handleUpdateData = React.useCallback(
    async (rowId: string, columnId: string, value: string | number | null) => {
      console.log("handle update data");
      const result = await fetch(
        `/api/importer/${initialImporterDto.importerId}/records`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          // TODO send correct format
          body: JSON.stringify({
            _id: rowId,
            columnId,
            value,
          }),
        }
      );
      // TODO handle result (reload etc.)
    },
    [initialImporterDto.importerId]
  );

  const handleLoadPage = React.useCallback(
    async (pageNumber: number) => {
      setTimeout(async () => {
        // needed to get the latest states
        if (currentlyLoading[pageNumber.toFixed()] || pageNumber in pageData) {
          return;
        }
        setCurrentlyLoading({
          ...currentlyLoading,
          [pageNumber]: true,
        });
        try {
          const result = await fetchRecords(pageNumber, 100);
          setPageData({
            ...pageData,
            [pageNumber]: result,
          });
        } finally {
          setCurrentlyLoading({
            ...currentlyLoading,
            [pageNumber]: false,
          });
        }
      });
    },
    [currentlyLoading, fetchRecords, pageData]
  );

  const dataStats = {
    total: initialImporterDto.status.totalRows,
  };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Validate your data</h1>
      <div className="mb-4">
        <ValidationTable
          importerDto={importer}
          data={pageData}
          validations={[]}
          totalRows={dataStats.total}
          onUpdateData={handleUpdateData}
          onLoadPage={handleLoadPage}
        />
      </div>
      <div className="flex justify-end">
        <Button>
          Start import <ChevronRightCircleIcon className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Validation;
