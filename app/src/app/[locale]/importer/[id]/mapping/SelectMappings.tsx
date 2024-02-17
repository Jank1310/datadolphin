"use client";
import {
  DataMappingRecommendation,
  ImporterDto,
} from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { useGetMappingRecommendations } from "@/components/hooks/useGetMappingRecommendations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/basicTable";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { produce } from "immer";
import { ChevronRightCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";
import { getPageForState } from "../redirectUtil";

type Props = {
  initialImporterDto: ImporterDto;
  initialDataMappingsRecommendations: DataMappingRecommendation[] | null;
};

interface Mapping {
  sourceColumn: string;
  targetColumn: string | null;
}

const SelectMappings = ({
  initialImporterDto,
  initialDataMappingsRecommendations,
}: Props) => {
  const { push } = useRouter();
  const { t } = useTranslation();
  const frontendFetch = useFrontendFetchWithAuth();
  const [enablePolling, setEnablePolling] = React.useState(false);
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    enablePolling ? 500 : undefined,
    initialImporterDto
  );
  const { recommendations: dataMappingRecommendations } =
    useGetMappingRecommendations(
      initialImporterDto.importerId,
      enablePolling ? 500 : undefined,
      { recommendations: initialDataMappingsRecommendations }
    );

  const isWaitingForMappingRecommendations =
    dataMappingRecommendations === null;
  const isMappingData = importer.status.isMappingData;

  React.useEffect(() => {
    if (isWaitingForMappingRecommendations || isMappingData) {
      setEnablePolling(true);
    }
  }, [isMappingData, isWaitingForMappingRecommendations]);

  const [currentMappings, setCurrentMappings] = React.useState<Mapping[]>([]);
  React.useEffect(() => {
    const newMapping =
      dataMappingRecommendations?.map((recommendation) => {
        return {
          sourceColumn: recommendation.sourceColumn,
          targetColumn: recommendation.targetColumn,
        };
      }) ?? [];
    setCurrentMappings(newMapping);
  }, [dataMappingRecommendations]);

  const handleChangeMapping = (
    sourceColumn: string,
    newTargetColumn: string | null
  ) => {
    const newMapping = produce(currentMappings, (draft) => {
      const mapping = draft.find((m) => m.sourceColumn === sourceColumn);
      if (mapping) {
        mapping.targetColumn = newTargetColumn;
      }
    });
    setCurrentMappings(newMapping);
  };

  const [isSavingMapping, setIsSavingMapping] = React.useState(false);
  const handleSaveMapping = async () => {
    if (isSavingMapping) {
      return;
    }
    setIsSavingMapping(true);
    try {
      await frontendFetch(
        `${getHost()}/api/importer/${importer.importerId}/mappings`,
        {
          method: "PUT",
          body: JSON.stringify(currentMappings),
        }
      );
      setEnablePolling(true);
    } catch (err) {
      console.error(err);
      setIsSavingMapping(false); // only set on error to prevent flickering
    }
  };

  const pageForState = getPageForState(importer);
  React.useEffect(() => {
    if (pageForState !== "mapping") {
      push(pageForState);
    }
  }, [pageForState, push]);

  if (isWaitingForMappingRecommendations) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col items-center">
          <span className="text-slate-500">
            {t("mappings.waitingForMappings")}
          </span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
      </div>
    );
  }

  if (isMappingData) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col items-center">
          <span className="text-slate-500">
            {t("mappings.applyingMappings")}
          </span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-14 flex justify-between items-center px-4">
        <h1 className="text-3xl font-bold">{t("mappings.title")}</h1>
        <div className="">
          <Button disabled={isSavingMapping} onClick={handleSaveMapping}>
            {t("mappings.btnConfirmMappings")}{" "}
            <ChevronRightCircleIcon className="ml-2" />
          </Button>
        </div>
      </div>
      <div className="px-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-4 h-[calc(100vh_-_4.5rem)] overflow-auto">
          <Table className="">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">
                  {t("mappings.columnsInYourFile")}
                </TableHead>
                <TableHead className="w-1/2">
                  {t("mappings.targetColumns")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMappings.map((mapping, n) => {
                return (
                  <TableRow key={`recommendation-${mapping.sourceColumn}-${n}`}>
                    <TableCell>{mapping.sourceColumn}</TableCell>
                    <TableCell>
                      <Select
                        value={mapping.targetColumn ?? "none"}
                        onValueChange={(newTargetColumn) =>
                          handleChangeMapping(
                            mapping.sourceColumn,
                            newTargetColumn === "none" ? null : newTargetColumn
                          )
                        }
                      >
                        <SelectTrigger
                          className={
                            mapping.targetColumn === null
                              ? "text-gray-400"
                              : "text-primary font-semibold"
                          }
                        >
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={"none"}>
                            {t("mappings.noSelectionItem")}
                          </SelectItem>

                          {importer.config.columnConfig.map((targetColumn) => (
                            <SelectItem
                              disabled={
                                currentMappings.find(
                                  (m) => m.targetColumn === targetColumn.key
                                ) !== undefined
                              }
                              value={targetColumn.key}
                              key={`recommendation-${mapping.sourceColumn}-select-option-${targetColumn.key}`}
                            >
                              {targetColumn.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SelectMappings;
