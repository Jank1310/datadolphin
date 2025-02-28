import type { Validator } from ".";
import type { RegexColumnValidation } from "../ColumnValidation";
import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";

export class RegexValidator implements Validator {
	validate(
		row: DataSetRow,
		columnConfig: { column: string; config: RegexColumnValidation }[],
	): Record<string, ValidationMessage> {
		const errors: Record<string, ValidationMessage> = {};
		const cache: Record<string, boolean> = {};
		for (const {
			column,
			config: { regex },
		} of columnConfig) {
			const dataToValidate = row.data[column].value;
			const isEmptyValue = Boolean(dataToValidate) === false;
			if (isEmptyValue) {
				continue;
			}
			if (cache[column] === false) {
				errors[column] = {
					type: "regex",
					message: `value does not match regex ${regex}`,
				};
			} else {
				const regexTestResult =
					regex && new RegExp(regex).test(dataToValidate as string);
				cache[column] = regexTestResult as boolean;
				if (regexTestResult === false) {
					errors[column] = {
						type: "regex",
						message: `value does not match regex ${regex}`,
					};
				}
			}
		}
		return errors;
	}
}
