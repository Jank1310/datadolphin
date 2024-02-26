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
      const isEmptyValue = Boolean(dataToValidate) === false;
      if (isEmptyValue) {
        continue;
      }
      const isValueInEnum =
        typeof dataToValidate === "string" &&
        config.values.includes(dataToValidate);
      if (isValueInEnum === false) {
        errors[column] = {
          type: "enum",
          message: "value is not a valid enum",
        };
      }
    }
    return errors;
  }
}
