import { Validator } from ".";
import { RegexColumnValidation } from "../ColumnValidation";
import { ValidationError } from "../ValidationError";

export class RegexValidator implements Validator {
  validate(
    row: Record<string, string | number | null>,
    columnConfig: { column: string; config: RegexColumnValidation }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    const cache: Record<string, boolean> = {};
    for (const {
      column,
      config: { regex },
    } of columnConfig) {
      let dataToValidate = row[column];
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
