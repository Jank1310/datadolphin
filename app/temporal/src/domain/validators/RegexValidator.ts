import { OutputData } from "../DataAnalyzer";

export class RegexValidator {
  validate(
    row: Record<string, OutputData>,
    columnConfig: { column: string; regex: string | undefined }[]
  ) {
    for (const config of columnConfig) {
      const { column: columnToValidate, regex } = config;
      let dataToValidate = row[columnToValidate];
      if (
        regex &&
        new RegExp(regex).test(dataToValidate.value as string) === false
      ) {
        row[columnToValidate].errors?.push({
          type: "regex",
          message: `value does not match regex ${regex}`,
        });
      }
    }
  }
}
