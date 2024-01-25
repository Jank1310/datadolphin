export type FieldValues = string | number | null;

export type DataSetRow = {
  __rowId: number;
} & Record<string, FieldValues>;

export type DataSet = DataSetRow[];
export interface DataSetPatch {
  rowId: number;
  /**
   * target column
   */
  column: string;
  newValue: FieldValues;
}
