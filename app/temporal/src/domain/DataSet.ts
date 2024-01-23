export interface DataSetPatch {
  rowId: number;
  /**
   * target column
   */
  column: string;
  newValue: string | number | null;
}
