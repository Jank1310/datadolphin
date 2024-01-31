import { Validator } from ".";
import { ColumnValidation } from "../ColumnValidation";
import { SourceFileStatsPerColumn } from "../DataAnalyzer";
import { DataSetRow } from "../DataSet";
import { ValidationMessage } from "../ValidationMessage";

export class UniqueValidator implements Validator {
  constructor() {}

  validate(
    row: DataSetRow,
    columnConfig: { column: string; config: ColumnValidation }[],
    stats: SourceFileStatsPerColumn = {}
  ) {
    const errors: Record<string, ValidationMessage> = {};
    for (const { column } of columnConfig) {
      let dataToValidate = row.data[column].value;
      if (!stats[column].nonunique) {
        console.error(stats);
        throw new Error(`No stats for column ${column}`);
      }
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
