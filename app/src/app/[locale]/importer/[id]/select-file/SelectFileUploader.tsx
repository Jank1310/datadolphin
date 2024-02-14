"use client";
import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useGetImporter } from "@/components/hooks/useGetImporter";
import { LoadingSpinner } from "@/components/ui/loadingSpinner";
import { useToast } from "@/components/ui/use-toast";
import { fetchWithAuth } from "@/lib/frontendFetch";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { getPageForState } from "../redirectUtil";
import FileUpload from "./FileUpload";

type Props = {
  importerDto: ImporterDto;
};

const allowedMimeTypes = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const SelectFileUploader = ({ importerDto: initialImporterDto }: Props) => {
  const { t } = useTranslation();
  const { push, replace } = useRouter();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);
  const [hasUploaded, setHasUploaded] = React.useState(false);
  const { importer } = useGetImporter(
    initialImporterDto.importerId,
    hasUploaded ? 500 : undefined,
    initialImporterDto
  );

  const handleSubmitFile = async (file: File) => {
    if (file) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("importerId", importer.importerId);
        await fetchWithAuth("/api/upload", {
          method: "POST",
          body: formData,
        });
        setHasUploaded(true);
      } catch (err) {
        console.error(err);
        setIsUploading(false);
        toast({
          title: t("select-file.toast.errorUploading"),
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const pageForState = getPageForState(importer);
  React.useEffect(() => {
    if (pageForState !== "select-file") {
      push(pageForState);
    }
  }, [pageForState, push]);

  const isProcessingSourceFile = importer.status.isProcessingSourceFile;

  return (
    <>
      {isUploading || isProcessingSourceFile || hasUploaded ? (
        <div className="flex flex-col items-center">
          <span className="text-slate-500">
            {isUploading
              ? t("select-file.uploading")
              : t("select-file.processingFile")}
          </span>
          <LoadingSpinner className="text-slate-500 mt-2" />
        </div>
      ) : (
        <FileUpload
          importerId={importer.importerId}
          allowedMimeTypes={allowedMimeTypes}
          onSubmitFile={handleSubmitFile}
        />
      )}
    </>
  );
};

export default SelectFileUploader;
