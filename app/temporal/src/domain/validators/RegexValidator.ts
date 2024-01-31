import { Validator } from ".";
import { RegexColumnValidation } from "../ColumnValidation";
import { DataSetRow } from "../DataSet";
import { ValidationMessage } from "../ValidationMessage";

export class RegexValidator implements Validator {
  validate(
    row: DataSetRow,
    columnConfig: { column: string; config: RegexColumnValidation }[]
  ): Record<string, ValidationMessage> {
    const errors: Record<string, ValidationMessage> = {};
    const cache: Record<string, boolean> = {};
    for (const {
      column,
      config: { regex },
    } of columnConfig) {
      let dataToValidate = row.data[column].value;
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
