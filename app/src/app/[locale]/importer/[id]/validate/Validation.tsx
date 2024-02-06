"use client";

import { ImporterDto, SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { RecordUpdateResult } from "@/app/api/importer/[slug]/records/RecordUpdateResult";
import { useFetchRecords } from "@/components/hooks/useFetchRecords";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import { enableMapSet, produce } from "immer";
import { ChevronRightCircleIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const handleRecordUpdate = React.useCallback(
    (
      rowIndex: number,
      rowId: string,
      _columnId: string,
      result: RecordUpdateResult
    ) => {
      // update messages
      const rowPage = Math.floor(rowIndex / 100);
      setPageData(
        produce((draft) => {
          const page = draft[rowPage];
          const row = page.find((r) => r._id === rowId);
          if (!row) {
            throw new Error("row not found: " + rowId);
          }
          for (const newMessagesColumnId in result.newMessagesByColumn) {
            row.data[newMessagesColumnId].messages =
              result.newMessagesByColumn[newMessagesColumnId];
          }
        })
      );
      // reload importer to get latest stats
    },
    []
  );
  const handleUpdateData = React.useCallback(
    async (
      rowIndex: number,
      rowId: string,
      columnId: string,
      value: string | number | null
    ) => {
      setCurrentValidations(
        produce((draft) => {
          if (!draft[rowId]) {
            draft[rowId] = {};
          }
          draft[rowId][columnId] = true;
        })
      );
      try {
        const res = await fetch(
          `/api/importer/${initialImporterDto.importerId}/records`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              _id: rowId,
              columnId,
              value,
            }),
          }
        );
        if (isMounted()) {
          const result = (await res.json()) as RecordUpdateResult;
          handleRecordUpdate(rowIndex, rowId, columnId, result);
        }
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
    [handleRecordUpdate, initialImporterDto.importerId, isMounted]
  );

  const dataStats = {
    total: initialImporterDto.status.totalRows,
  };

  if (isMappingData) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col items-center">
          <span className="text-slate-500">
            {t("validation.processingData")}
          </span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-14 flex justify-between items-center px-4">
        <h1 className="text-3xl font-bold">{t("validation.title")}</h1>
        <div className="">
          <Button>
            {t("validation.btnConfirmData")}
            <ChevronRightCircleIcon className="ml-2" />
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
