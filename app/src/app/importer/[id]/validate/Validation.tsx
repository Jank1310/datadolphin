"use client";

import {
  DataValidation,
  ImporterDto,
  SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { useGetValidations } from "@/components/hooks/useGetValidations";
import { Button } from "@/components/ui/button";
import { enableMapSet, produce } from "immer";
import { chunk } from "lodash";
import { ChevronRightCircleIcon } from "lucide-react";
import React from "react";
import ValidationTable from "./ValidationTable";
enableMapSet();
type Props = {
  initialImporterDto: ImporterDto;
  initialSourceData: SourceData[];
  initialValidation: DataValidation[];
};

const Validation = ({
  initialImporterDto,
  initialSourceData,
  initialValidation,
}: Props) => {
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    undefined,
    initialImporterDto
  );
  // const { data: sourceData } = useGetSourceData(
  //   initialImporterDto.importerId,
  //   initialSourceData
  // );
  console.time("RENDER validation");
  const chunks = React.useMemo(
    () => chunk(initialSourceData, 100),
    [initialSourceData]
  );
  const [currentlyLoading, setCurrentlyLoading] = React.useState({});
  const [pageData, setPageData] = React.useState<Record<number, SourceData[]>>({
    0: chunks[0],
  });
  const { validations } = useGetValidations(
    initialImporterDto.importerId,
    undefined,
    initialValidation
  );

  const handleUpdateData = React.useCallback(
    (rowIndex: number, columnId: string, value: string | number | null) => {
      console.log("handle update data");
      const newData = produce(pageData, (draft) => {
        const expectedPageNumber = Math.floor(rowIndex / 100);
        if (expectedPageNumber in draft === false) {
          throw new Error("Page not found");
        }
        const page = draft[expectedPageNumber];
        const entry = page.find((entry) => entry.rowIndex === rowIndex);
        if (entry) {
          entry[columnId] = value;
        } else {
          throw new Error("Row not found");
        }
      });
      setPageData(newData);
    },
    [pageData]
  );

  const handleLoadPage = React.useCallback(
    (pageNumber: number) => {
      // TODO: Load page
      console.log("would load page", pageNumber);
      if (pageNumber in currentlyLoading) {
        return;
      }
      console.log("set page data", pageNumber);
      setPageData({
        ...pageData,
        [pageNumber]: chunks[pageNumber],
      });
    },
    [chunks, currentlyLoading, pageData]
  );

  const dataStats = {
    total: initialSourceData.length,
  };
  console.timeEnd("RENDER validation");
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Validate your data</h1>
      <div className="mb-4">
        <ValidationTable
          importerDto={importer}
          data={pageData}
          validations={validations}
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
