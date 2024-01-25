import { DataSetRow } from "../DataSet";
import { ValidationError } from "../ValidationError";

export class RequiredValidator {
  validate(
    row: DataSetRow,
    columnConfig: { column: string; regex?: string }[]
  ): Record<string, ValidationError> {
    const errors: Record<string, ValidationError> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
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
