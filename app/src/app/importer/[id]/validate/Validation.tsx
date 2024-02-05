"use client";

import { ImporterDto, SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { useFetchRecords } from "@/components/hooks/useFetchRecords";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import { enableMapSet, produce } from "immer";
import { ChevronRightCircleIcon } from "lucide-react";
import React from "react";
import { useIsMounted } from "usehooks-ts";
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
  const [enablePolling, setEnablePolling] = React.useState(false);
  const [currentValidations, setCurrentValidations] = React.useState<
    Record<string /* rowId */, Record<string /* columnId */, boolean>>
  >({});
  const isMounted = useIsMounted();
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    enablePolling ? 500 : undefined,
    initialImporterDto
  );
  const [currentlyLoading, setCurrentlyLoading] = React.useState<
    Record<string, boolean>
  >({});
  const [pageData, setPageData] = React.useState<Record<number, SourceData[]>>({
    0: initialData,
  });
  const fetchRecords = useFetchRecords(initialImporterDto.importerId);
  const isMappingData = importer.status.isMappingData;

  const handleLoadPage = React.useCallback(
    async (pageNumber: number, force: boolean = false) => {
      setTimeout(async () => {
        // needed to get the latest states
        if (
          !force &&
          (currentlyLoading[pageNumber.toFixed()] || pageNumber in pageData)
        ) {
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

  React.useEffect(() => {
    if (isMappingData) {
      setEnablePolling(true);
    } else {
      if (enablePolling) {
        handleLoadPage(0, true);
        setEnablePolling(false);
      }
    }
  }, [enablePolling, handleLoadPage, isMappingData]);
  const handleUpdateData = React.useCallback(
    async (rowId: string, columnId: string, value: string | number | null) => {
      setCurrentValidations(
        produce((draft) => {
          if (!draft[rowId]) {
            draft[rowId] = {};
          }
          draft[rowId][columnId] = true;
        })
      );
      try {
        await fetch(`/api/importer/${initialImporterDto.importerId}/records`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            _id: rowId,
            columnId,
            value,
          }),
        });
      } finally {
        if (isMounted()) {
          setCurrentValidations(
            produce((draft) => {
              if (!draft[rowId]) {
                draft[rowId] = {};
              }
              draft[rowId][columnId] = false;
            })
          );
        }
      }
      // TODO handle result (reload etc.)
    },
    [initialImporterDto.importerId, isMounted]
  );

  const dataStats = {
    total: initialImporterDto.status.totalRows,
  };

  if (isMappingData) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col items-center">
          <span className="text-slate-500">Processing data...</span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-14 flex justify-between items-center px-4">
        <h1 className="text-3xl font-bold">Validate your data</h1>
        <div className="">
          <Button>
            Start import <ChevronRightCircleIcon className="ml-2" />
          </Button>
        </div>
      </div>
      <div className="px-4">
        <ValidationTable
          importerDto={importer}
          data={pageData}
          totalRows={dataStats.total}
          onUpdateData={handleUpdateData}
          onLoadPage={handleLoadPage}
          currentValidations={currentValidations}
        />
      </div>
    </div>
  );
};

export default Validation;
