import { Stats } from "../DataAnalyzer";
import { ValidationError } from "../ValidationError";

export class UniqueValidator {
  constructor() {}

  validate(
    row: Record<string, unknown>,
    columnConfig: { column: string; regex?: string }[],
    stats: Stats = {}
  ) {
    const errors: Record<string, ValidationError> = {};
    const columnsToValidate = columnConfig.map((item) => item.column);
    for (const columnToValidate of columnsToValidate) {
      let dataToValidate = row[columnToValidate];
      if (
        stats[columnToValidate] &&
        stats[columnToValidate].nonunique[dataToValidate as string]
      ) {
        errors[columnToValidate] = {
          type: "unique",
          message: "value is not unique",
        };
      }
    }
    return errors;
  }
}
