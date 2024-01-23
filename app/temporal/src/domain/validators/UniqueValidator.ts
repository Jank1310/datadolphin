import { OutputData } from "../DataAnalyzer";

export class UniqueValidator {
  constructor() {}

  validate(
    row: Record<string, OutputData>,
    columnConfig: { column: string; regex?: string }[],
    data: Record<string, OutputData>[] = []
  ) {
    for (const columnToValidate of columnConfig.map((item) => item.column)) {
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
