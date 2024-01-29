import { Validator } from ".";
import { EnumerationColumnValidation } from "../ColumnValidation";
import { DataSetRow } from "../DataSet";
import { ValidationMessage } from "../ValidationMessage";

export class EnumValidator implements Validator {
  public validate(
    row: DataSetRow,
    columnConfigs: { column: string; config: EnumerationColumnValidation }[]
  ): Record<string, ValidationMessage> {
    const errors: Record<string, ValidationMessage> = {};
    for (const { column, config } of columnConfigs) {
      let dataToValidate = row.data[column].value;
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
