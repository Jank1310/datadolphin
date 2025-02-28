import type { Validator } from ".";
import type { EnumerationColumnValidation } from "../ColumnValidation";
import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";

export class EnumValidator implements Validator {
	public validate(
		row: DataSetRow,
		columnConfigs: { column: string; config: EnumerationColumnValidation }[],
	): Record<string, ValidationMessage> {
		const errors: Record<string, ValidationMessage> = {};
		for (const { column, config } of columnConfigs) {
			const dataToValidate = row.data[column].value;
			if (Array.isArray(dataToValidate)) {
				const isEmptyValue = dataToValidate.length === 0;
				if (isEmptyValue) {
					continue;
				}
				for (const value of dataToValidate) {
					const isValueInEnum =
						typeof value === "string" && config.values.includes(value);
					if (isValueInEnum === false) {
						errors[column] = {
							type: "enum",
							message: `value is not a valid enum: ${value}`,
						};
						break;
					}
				}
			} else {
				const isEmptyValue = Boolean(dataToValidate) === false;
				if (isEmptyValue) {
					continue;
				}
				const isValueInEnum =
					typeof dataToValidate === "string" &&
					config.values.includes(dataToValidate);
				if (isValueInEnum === false) {
					errors[column] = {
						type: "enum",
						message: "value is not a valid enum",
					};
				}
			}
		}
		return errors;
	}
}
