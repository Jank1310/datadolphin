export interface ImporterDto {
  importerId: string;
  config: ImporterConfig;
  status: ImporterStatus;
}

export interface ImporterConfig {
  callbackUrl: string;
  columnConfig: ColumnConfig[];
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
  dataMappingRecommendations: DataMappingRecommendation[] | null;
  dataMapping: DataMapping[] | null;
}

export interface DataMappingRecommendation {
  targetColumn: string | null;
  sourceColumn: string;
  confidence: number;
}

export interface ColumnConfig {
  key: string;
  label: string;
  /**
   * If the column is a key, then this is the list of alternative keys that can be used to identify the column.
   */
  keyAlternatives?: string[];
  type: "text" | "number" | "date";
}

export interface DataMapping {
  targetColumn: string | null;
  sourceColumn: string;
}