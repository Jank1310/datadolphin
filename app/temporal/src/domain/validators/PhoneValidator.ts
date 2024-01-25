import { isPossiblePhoneNumber } from "libphonenumber-js";
import { DataSetRow } from "../DataSet";
import { ValidationError } from "../ValidationError";

export class PhoneValidator {
  validate(
    row: DataSetRow,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      // check if defaultCountry DE is ok
      if (
        isPossiblePhoneNumber((dataToValidate as string) ?? "", "DE") === false
      ) {
        errors[columnToValidate] = {
          type: "phone",
          message: "value is not a valid phone number",
        };
      }
    }
    return errors;
  }
}
