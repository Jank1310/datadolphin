import { Validator } from ".";
import { EnumerationColumnValidation } from "../ColumnValidation";
import { ValidationError } from "../ValidationError";

export class EnumValidator implements Validator {
  public validate(
    row: Record<string, string | number | null>,
    columnConfigs: { column: string; config: EnumerationColumnValidation }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    for (const { column, config } of columnConfigs) {
      let dataToValidate = row[column];
      if (!dataToValidate || typeof dataToValidate !== "string") {
        errors[column] = {
          type: "enum",
          message: "value is not a valid enum",
        };
      } else if (config.values.includes(dataToValidate) === false) {
        errors[column] = {
          type: "enum",
          message: "value is not a valid enum",
        };
      }
    }
    return errors;
  }
}
