import { ValidationError } from "../ValidationError";

const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export class EmailValidator {
  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      if (EMAIL_REGEX.test((dataToValidate as string) ?? "") === false) {
        errors[columnToValidate] = {
          type: "email",
          message: "value is not a valid email",
        };
      }
    }
    return errors;
  }
}
