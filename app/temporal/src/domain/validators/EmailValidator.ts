import { OutputData } from "../DataAnalyzer";

const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export class EmailValidator {
  validate(row: Record<string, OutputData>, columnsToValidate: string[]) {
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      if (EMAIL_REGEX.test((dataToValidate.value as string) ?? "") === false) {
        row[columnToValidate].errors?.push({
          type: "email",
          message: `value is not a valid email`,
        });
      }
    }
  }
}
