import { OutputData } from "../DataAnalyzer";

export class UniqueValidator {
  constructor() {}

  validate(
    row: Record<string, OutputData>,
    data: Record<string, OutputData>[],
    columnsToValidate: string[]
  ) {
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      if (
        data.filter(
          (item) => item[columnToValidate]?.value === dataToValidate.value
        ).length > 1
      ) {
        row[columnToValidate].errors?.push({
          type: "unique",
          message: "value is not unique",
        });
      }
    }
  }
}
