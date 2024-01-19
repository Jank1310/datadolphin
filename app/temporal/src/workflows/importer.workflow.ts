import { ColumnConfig } from "../domain/ColumnConfig";

export interface ImporterWorkflowParams {
  columnConfig: ColumnConfig[];
  callbackUrl: string;
}

/**
 * Entity workflow which represents a complete importer workflow
 */
export async function importer(params: ImporterWorkflowParams) {
  console.log("importer workflow started");

  // TODO: implement workflow
}
