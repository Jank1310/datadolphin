"use client";
import {
  DataSetPatch,
  DataValidation,
  ImporterDto,
  SourceData,
} from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { useGetPatches } from "@/components/hooks/useGetPatches";
import { useGetSourceData } from "@/components/hooks/useGetSourceData";
import { useGetValidations } from "@/components/hooks/useGetValidations";
import { Button } from "@/components/ui/button";
import { ChevronRightCircleIcon } from "lucide-react";
import ValidationTable from "./ValidationTable";

type Props = {
  initialImporterDto: ImporterDto;
  initialSourceData: SourceData[];
  initialPatches: DataSetPatch[];
  initialValidation: DataValidation[];
};

const Validation = ({
  initialImporterDto,
  initialSourceData,
  initialPatches,
  initialValidation,
}: Props) => {
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    undefined,
    initialImporterDto
  );
  const { data: sourceData } = useGetSourceData(
    initialImporterDto.importerId,
    initialSourceData
  );
  const { patches } = useGetPatches(
    initialImporterDto.importerId,
    undefined,
    initialPatches
  );
  const { validations } = useGetValidations(
    initialImporterDto.importerId,
    undefined,
    initialValidation
  );
  console.log(sourceData, patches, validations);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Validate your data</h1>
      <div className="mb-4">
        <ValidationTable
          importerDto={importer}
          data={sourceData}
          validations={validations}
          patches={patches}
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
