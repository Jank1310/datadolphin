import type { Validator } from ".";
import type { ColumnValidation } from "../ColumnValidation";
import type { SourceFileStatsPerColumn } from "../DataAnalyzer";
import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";

export class UniqueValidator implements Validator {
	validate(
		row: DataSetRow,
		columnConfig: { column: string; config: ColumnValidation }[],
		stats: SourceFileStatsPerColumn = {},
	) {
		const errors: Record<string, ValidationMessage> = {};
		for (const { column } of columnConfig) {
			const dataToValidate = row.data[column].value;
			const isEmptyValue = Boolean(dataToValidate) === false;
			if (isEmptyValue) {
				continue;
			}
			if (stats[column]?.nonunique[dataToValidate as string]) {
				errors[column] = {
					type: "unique",
					message: "value is not unique",
				};
			}
		}
		return errors;
	}
}
