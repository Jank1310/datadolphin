"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { useRouter } from "next/navigation";
import React from "react";
import FileUpload from "./FileUpload";

type Props = {
  importerDto: ImporterDto;
};

const allowedMimeTypes = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const ImportPage = ({ importerDto: initialImporterDto }: Props) => {
  const { push, replace } = useRouter();
  const [isUploading, setIsUploading] = React.useState(false);
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    undefined,
    initialImporterDto
  );

  const handleSubmitFile = async (file: File) => {
    if (file) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("importerId", importer.importerId);
        await fetch("/api/upload", { method: "POST", body: formData });
        push("mapping");
      } catch (err) {
        console.log(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const hasUploadedFile = importer.status.isWaitingForFile === false;
  if (hasUploadedFile) {
    replace("mapping");
    return null;
  }

  return (
    <div className="flex h-full items-center justify-center">
      {isUploading ? (
        <div>Uploading...</div>
      ) : (
        <FileUpload
          importerId={importer.importerId}
          allowedMimeTypes={allowedMimeTypes}
          onSubmitFile={handleSubmitFile}
        />
      )}
    </div>
  );
};

export default ImportPage;
