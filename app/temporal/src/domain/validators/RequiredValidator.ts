import { DataSetRow } from "../DataSet";
import { ValidationMessage } from "../ValidationMessage";

export class RequiredValidator {
  validate(
    row: DataSetRow,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationMessage> {
    const errors: Record<string, ValidationMessage> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row.data[columnToValidate].value;
      if (Boolean(dataToValidate) === false) {
        errors[columnToValidate] = {
          type: "required",
          message: "value is required",
        };
      }
    }
    return errors;
  }
}
