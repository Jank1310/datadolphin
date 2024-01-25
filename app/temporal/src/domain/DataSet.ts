export type FieldValues = string | number | null;

export type DataSetRow = {
  __sourceRowId: number;
  data: {
    [key: string]: {
      value: FieldValues;
      messages: { type: string; message: string }[];
    };
  };
};

export type DataSet = DataSetRow[];

export type SourceDataSetRow = {
  __sourceRowId: number;
} & Record<string, FieldValues>;

export type SourceDataSet = SourceDataSetRow[];
export interface DataSetPatch {
  rowId: number;
  /**
   * target column
   */
  column: string;
  newValue: FieldValues;
}
