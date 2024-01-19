"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import uploadIcon from "../assets/images/upload.svg";
type Props = {};

const Upload = (props: Props) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const inputRef = useRef<any>(null);
  const [file, setFile] = useState<any>(null);
  const allowedMimeTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  function isFileValid(file: any) {
    return allowedMimeTypes.includes(file.type);
  }

  function handleChange(e: any) {
    e.preventDefault();
    if (e.target.files && e.target.files[0] && isFileValid(e.target.files[0])) {
      setFile(e.target.files[0]);
    }
  }

  const handleSubmitFile = useCallback(async () => {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      // TODO: set importerId
      formData.append("importerId", "52f2df8d-750e-4925-a0bf-fb5e1e9625b0");
      await fetch("/api/upload", { method: "POST", body: formData });
    }
  }, [file]);

  useEffect(() => {
    handleSubmitFile();
  }, [file, handleSubmitFile]);

  function handleDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (
      e.dataTransfer.files &&
      e.dataTransfer.files[0] &&
      isFileValid(e.dataTransfer.files[0])
    ) {
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
    inputRef.current.value = "";
    inputRef.current.click();
  }

  return (
    <div
      className="flex items-center justify-center h-screen cursor-pointer"
      onClick={openFileExplorer}
    >
      <form
        className={`${
          dragActive ? "bg-blue-400" : "bg-blue-100"
        }  p-10 rounded-lg  min-h-[10rem] text-center flex flex-col items-center justify-center`}
        onDragEnter={handleDragEnter}
        onSubmit={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      >
        <input
          placeholder="fileInput"
          className="hidden"
          ref={inputRef}
          type="file"
          multiple={false}
          onChange={handleChange}
          accept=".xlsx,.xls,.csv"
        />
        <Image priority src={uploadIcon} alt="Upload file" />
        <p className="mt-4">
          Drag & Drop file or{" "}
          <span className="font-bold text-blue-600 cursor-pointer">
            <u>Select file</u>
          </span>{" "}
          to upload
        </p>
      </form>
    </div>
  );
};

export default Upload;
