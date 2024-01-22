import { OutputData } from "../DataAnalyzer";

export class RequiredValidator {
  validate(row: Record<string, OutputData>, columnsToValidate: string[]) {
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      if (dataToValidate.value == null || dataToValidate.value === "") {
        row[columnToValidate].errors?.push({
          type: "required",
          message: "value is required",
        });
      }
    }
  }
}
