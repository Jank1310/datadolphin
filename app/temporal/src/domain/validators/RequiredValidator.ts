import { OutputData } from "../DataAnalyzer";

export class RequiredValidator {
  validate(
    row: Record<string, OutputData>,
    columnConfig: { column: string; regex?: string }[]
  ) {
    for (const columnToValidate of columnConfig.map((item) => item.column)) {
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
