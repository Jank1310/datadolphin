export interface ImporterDto {
  importerId: string;
  config: ImporterConfig;
  status: ImporterStatus;
}

export interface ImporterConfig {
  callbackUrl: string;
  columnConfig: unknown[];
  /**
   * Timeout for upload of file.
   * If not set, defaults to 24 hours.
   */
  uploadTimeout?: string;
  /**
   * Timeout for the start of the import.
   * If not set, defaults to 24 hours.
   */
  startImportTimeout?: string;
  name: string;
  description?: string;
  meta: Record<string, string>;
  logo: string;
}

export interface ImporterStatus {
  isWaitingForFile: boolean;
  isWaitingForImport: boolean;
  isImporting: boolean;
}
