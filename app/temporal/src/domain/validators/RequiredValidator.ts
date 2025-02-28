import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";

export class RequiredValidator {
	validate(
		row: DataSetRow,
		columnConfig: { column: string; regex?: string }[],
	): Record<string, ValidationMessage> {
		const errors: Record<string, ValidationMessage> = {};
		const columnsToValidate = columnConfig.map((item) => item.column);
		for (const columnToValidate of columnsToValidate) {
			const dataToValidate = row.data[columnToValidate].value;
			if (Boolean(dataToValidate) === false) {
				errors[columnToValidate] = {
					type: "required",
					message: "value is required",
				};
			}
		}
		return errors;
	}
}
