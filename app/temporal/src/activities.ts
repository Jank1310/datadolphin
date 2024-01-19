import csv from "csvtojson";
import * as Minio from "minio";
import { extname } from "path";
export interface DownloadSourceFileParams {
  filename: string;
  importerId: string;
}

export interface DownloadSourceFileReturnType {
  metaData: Record<string, string>;
  localFilePath: string;
}

export function makeActivities() {
  // TODO: fix env vars
  // const minioClient = new Minio.Client({
  //   endPoint: env.get("MINIO_HOST").required().asString(),
  //   port: 9000,
  //   useSSL: false,
  //   accessKey: env.get("MINIO_ACCESS_KEY").required().asString(),
  //   secretKey: env.get("MINIO_SECRET_KEY").required().asString(),
  // });
  const minioClient = new Minio.Client({
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "Sr3fsXr7gqAf88q81dfm",
    secretKey: "aMNoi71dpS0rMbyvNgbojSk0OkRpn6sqGaLAVjpG",
  });

  return {
    downloadSourceFile: async (
      params: DownloadSourceFileParams
    ): Promise<DownloadSourceFileReturnType> => {
      const bucketExists = await minioClient.bucketExists(params.importerId);
      if (bucketExists === false) {
        throw new Error(`Bucket ${params.importerId} does not exist`);
      }
      const fileStats = await minioClient.statObject(
        params.importerId,
        params.filename
      );
      if (!fileStats) {
        throw new Error(`could not find file ${params.filename}`);
      }
      console.log("fileStats", fileStats);
      const { metaData } = fileStats;
      const localFilePath = `/tmp/${params.filename}`;
      await minioClient.fGetObject(
        params.importerId,
        params.filename,
        `/tmp/${params.filename}`
      );
      return { metaData, localFilePath };
    },
    processSourceFile: async (params: { localFilePath: string }) => {
      switch (extname(params.localFilePath)) {
        case ".csv":
          // fix csv from file
          const jsonArray = await csv().fromFile(params.localFilePath);
          console.log("data", jsonArray);
          break;
        case ".xls":
        case ".xlsx":
          break;
      }
    },
  };
}
