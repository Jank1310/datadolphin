import { Validator } from ".";
import { ColumnValidation } from "../ColumnValidation";
import { SourceFileStatsPerColumn } from "../DataAnalyzer";
import { DataSetRow } from "../DataSet";
import { ValidationError } from "../ValidationError";

export class UniqueValidator implements Validator {
  constructor() {}

  validate(
    row: DataSetRow,
    columnConfig: { column: string; config: ColumnValidation }[],
    stats: SourceFileStatsPerColumn = {}
  ) {
    const errors: Record<string, ValidationError> = {};
    for (const { column } of columnConfig) {
      let dataToValidate = row[column];
      if (stats[column] && stats[column].nonunique[dataToValidate as string]) {
        errors[column] = {
          type: "unique",
          message: "value is not unique",
        };
      }
    }
    return errors;
  }
}
