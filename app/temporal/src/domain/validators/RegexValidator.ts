import { ValidationError } from "../ValidationError";

export class RegexValidator {
  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    const cache: Record<string, boolean> = {};
    for (const config of columnConfig) {
      const { column: columnToValidate, regex } = config;
      let dataToValidate = row[columnToValidate];
      if (cache[columnToValidate] === false) {
        errors[columnToValidate] = {
          type: "regex",
          message: `value does not match regex ${regex}`,
        };
      } else {
        const regexTestResult =
          regex && new RegExp(regex).test(dataToValidate as string);
        cache[columnToValidate] = regexTestResult as boolean;
        if (regexTestResult === false) {
          errors[columnToValidate] = {
            type: "regex",
            message: `value does not match regex ${regex}`,
          };
        }
      }
    }
    return errors;
  }
}
