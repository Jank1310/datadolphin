import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { Button } from "@/components/ui/button";
import { ChevronRightCircleIcon } from "lucide-react";
import ValidationTable from "./ValidationTable";

type Props = {
  initialImporterDto: ImporterDto;
};

const Validation = ({ initialImporterDto }: Props) => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Validate your data</h1>
      <div className="mb-4">
        <ValidationTable importerDto={initialImporterDto} />
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
