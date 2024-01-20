import csv from "csv";
import { FileStore } from "./infrastructure/FileStore";
export interface DownloadSourceFileParams {
  filename: string;
  importerId: string;
}

export interface DownloadSourceFileReturnType {
  metaData: Record<string, string>;
  localFilePath: string;
}

export function makeActivities(fileStore: FileStore) {
  return {
    deleteBucket: async (params: { bucket: string }) => {
      await fileStore.deleteBucket(params.bucket);
    },
    processSourceFile: async (params: {
      bucket: string;
      fileReference: string;
      format: string;
      formatOptions: { delimiter?: string };
      outputFileReference: string;
    }) => {
      const fileData = await fileStore.getFile(
        params.bucket,
        params.fileReference
      );
      switch (params.format) {
        case "csv":
          const rows = await new Promise<Record<string, string>[]>(
            (resolve, reject) => {
              csv.parse(
                fileData,
                {
                  columns: true,
                  delimiter: params.formatOptions.delimiter ?? ",",
                  relax_column_count: true,
                },
                (err, records) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(records);
                  }
                }
              );
            }
          );
          console.log("received rows", rows.length);
          const data = Buffer.from(JSON.stringify(rows));
          fileStore.putFile(params.bucket, params.outputFileReference, data);
          break;
        case "xlsx":
      }
    },
  };
}
