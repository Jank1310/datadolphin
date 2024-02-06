"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: process.env.NEXT_PUBLIC_AUTH_TOKEN as string,
          },
          body: formData,
        });
        push("mapping");
      } catch (err) {
        console.error(err);
      } finally {
        // is reset before the page is navigated away from
        // setIsUploading(false);
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
        <div className="flex flex-col items-center">
          <span className="text-slate-500">{t("import.uploading")}</span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
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
