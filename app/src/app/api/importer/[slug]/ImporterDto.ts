export interface ImporterDto {
  importerId: string;
  config: ImporterConfig;
  status: ImporterStatus;
}

export interface ImporterConfig {
  name: string;
  description: string;
  columnConfig: unknown;
  callbackUrl: string;
}

export interface ImporterStatus {
  isWaitingForFile: boolean;
  isWaitingForImport: boolean;
  isImporting: boolean;
}
