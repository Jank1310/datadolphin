import { ValidationError } from "../ValidationError";

export class RegexValidator {
  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    for (const config of columnConfig) {
      const { column: columnToValidate, regex } = config;
      let dataToValidate = row[columnToValidate];
      if (regex && new RegExp(regex).test(dataToValidate as string) === false) {
        errors[columnToValidate] = {
          type: "regex",
          message: `value does not match regex ${regex}`,
        };
      }
    }
    return errors;
  }
}
