"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UploadCloudIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
    importerId: string;
    allowedMimeTypes: string[];
    onSubmitFile: (file: File) => void;
};

const FileUpload = ({ importerId, allowedMimeTypes, onSubmitFile }: Props) => {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);

    function isFileValid(file: any) {
        return allowedMimeTypes.includes(file.type);
    }

    function handleChange(e: any) {
        e.preventDefault();
        if (e.target.files && e.target.files[0] && isFileValid(e.target.files[0])) {
            setFile(e.target.files[0]);
        }
    }

    function handleDrop(e: any) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && isFileValid(e.dataTransfer.files[0])) {
            setFile(e.dataTransfer.files[0]);
        }
    }

    function handleDragLeave(e: any) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }

    function handleDragOver(e: any) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }

    function handleDragEnter(e: any) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }

    function openFileExplorer() {
        if (!inputRef.current) {
            return;
        }
        inputRef.current.value = "";
        inputRef.current.click();
    }

    return (
        <div>
            <form
                className={cn(
                    "bg-gray-50 text-center px-4 rounded w-80 flex flex-col items-center justify-center cursor-pointer border-2 border-gray-400 border-dashed mx-auto font-[sans-serif]",
                    {
                        "border-primary": dragActive,
                        "bg-primary/10": dragActive,
                    }
                )}
                onDragEnter={handleDragEnter}
                onSubmit={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
            >
                <div className="py-6">
                    <UploadCloudIcon className="inline-block w-12 h-12 text-gray-600" />
                    <h4 className="text-base font-semibold text-gray-600">{t("select-file.uploader.dragAndDrop")}</h4>
                </div>
                <hr className="w-full border-gray-400 my-2" />
                {file && (
                    <Card>
                        <CardContent className="flex items-center justify-center py-2">
                            <span>{file.name}</span>
                        </CardContent>
                    </Card>
                )}
                <div className="py-4">
                    <input
                        id="uploadFile1"
                        placeholder="fileInput"
                        className="hidden"
                        ref={inputRef}
                        type="file"
                        multiple={false}
                        onChange={handleChange}
                        accept=".xlsx,.xls,.csv"
                    />
                    {!file && (
                        <>
                            <Button onClick={openFileExplorer}>{t("select-file.uploader.btnBrowseFile")}</Button>
                            <p className="text-xs text-gray-400 mt-4">{t("select-file.uploader.supportedFormats")}</p>
                        </>
                    )}
                </div>
            </form>

            {file && (
                <div className="mt-4 flex justify-center">
                    <Button
                        onClick={() => {
                            if (file) {
                                onSubmitFile(file);
                            }
                        }}
                    >
                        {t("select-file.uploader.btnUpload")}
                        <UploadCloudIcon className="ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
