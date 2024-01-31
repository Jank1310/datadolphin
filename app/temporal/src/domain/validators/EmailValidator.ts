import { Validator } from ".";
import { ColumnValidation } from "../ColumnValidation";
import { DataSetRow } from "../DataSet";
import { ValidationMessage } from "../ValidationMessage";

const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export class EmailValidator implements Validator {
  validate(
    row: DataSetRow,
    columnConfig: { column: string; config: ColumnValidation }[]
  ): Record<string, ValidationMessage> {
    const errors: Record<string, ValidationMessage> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row.data[columnToValidate].value;
      if (EMAIL_REGEX.test((dataToValidate as string) ?? "") === false) {
        errors[columnToValidate] = {
          type: "email",
          message: "value is not a valid email",
        };
      }
    }
    return errors;
  }
}
