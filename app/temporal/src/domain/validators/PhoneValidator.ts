import { isValidPhoneNumber } from "libphonenumber-js";
import type { PhoneColumnValidation } from "../ColumnValidation";
import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";

export class PhoneValidator {
	validate(
		row: DataSetRow,
		columnConfig: { column: string; config: PhoneColumnValidation }[],
	): Record<string, ValidationMessage> {
		const errors: Record<string, ValidationMessage> = {};
		for (const { column, config } of columnConfig) {
			const dataToValidate = row.data[column].value;
			const isEmptyValue = Boolean(dataToValidate) === false;
			if (isEmptyValue) {
				continue;
			}
			if (
				typeof dataToValidate !== "string" ||
				isValidPhoneNumber(dataToValidate, config.defaultCountry) === false
			) {
				errors[column] = {
					type: "phone",
					message: "value is not a valid phone number",
				};
			}
		}
		return errors;
	}
}
