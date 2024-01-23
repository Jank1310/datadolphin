import { ValidationError } from "../ValidationError";

export class RequiredValidator {
  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    for (const columnToValidate of columnConfig.map((item) => item.column)) {
      let dataToValidate = row[columnToValidate];
      if (dataToValidate == null || dataToValidate === "") {
        errors[columnToValidate] = {
          type: "required",
          message: "value is required",
        };
      }
    }
    return errors;
  }
}
