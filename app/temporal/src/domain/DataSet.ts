import type { ObjectId } from "mongodb";

export type FieldValues = string[] | string | number | null;

export type DataSetRow = {
	_id: ObjectId;
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
	_id: ObjectId;
	__sourceRowId: number;
} & Record<string, FieldValues>;

export type SourceDataSet = SourceDataSetRow[];
export interface DataSetPatch {
	rowId: string;
	/**
	 * target column
	 */
	column: string;
	newValue: FieldValues;
}
