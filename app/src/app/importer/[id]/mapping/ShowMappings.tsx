"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/basicTable";
import { Button } from "@/components/ui/button";
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

import React from "react";

type Props = {
  importerDto: ImporterDto;
};

interface Mapping {
  sourceColumn: string;
  targetColumn: string | null;
}

const ShowMappings = ({ importerDto: initialImporterDto }: Props) => {
  const { push } = useRouter();
  const [enablePolling, setEnablePolling] = React.useState(false);
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    enablePolling ? 1000 : undefined,
    initialImporterDto
  );
  const {
    status: { dataMappingRecommendations },
  } = importer;

  React.useEffect(() => {
    if (
      !dataMappingRecommendations ||
      dataMappingRecommendations.length === 0
    ) {
      setEnablePolling(true);
    } else {
      setEnablePolling(false);
    }
  }, [dataMappingRecommendations]);

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
      await fetch(`/api/importer/${importer.importerId}/mappings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentMappings),
      });
      push("validate");
    } catch (err) {
      console.log(err);
    } finally {
      setIsSavingMapping(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-4">
        Change or confirm column matches
      </h1>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-4">
        <Table className="">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Columns in your file</TableHead>
              <TableHead className="w-1/2">Import fields</TableHead>
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
                        <SelectItem value={"none"}>None</SelectItem>

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
      <div className="flex justify-end">
        <Button disabled={isSavingMapping} onClick={handleSaveMapping}>
          Confirm mapping <ChevronRightCircleIcon className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ShowMappings;
