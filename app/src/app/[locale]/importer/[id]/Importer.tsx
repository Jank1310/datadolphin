"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";

export interface ImporterProps {
  importerDto: ImporterDto;
}

export const Importer = (props: ImporterProps) => {
  const { importer, error } = useGetImporter(
    props.importerDto.importerId,
    undefined,
    props.importerDto
  );
  if (error) {
    return <div className="flex justify-center items-center">Error</div>;
  }
  return <div>{importer.importerId}</div>;
};
