import { isPossiblePhoneNumber } from "libphonenumber-js";
import { ValidationError } from "../ValidationError";

export class PhoneValidator {
  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    for (const columnToValidate of columnConfig.map((item) => item.column)) {
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
