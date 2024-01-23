import { isPossiblePhoneNumber } from "libphonenumber-js";
import { OutputData } from "../DataAnalyzer";

export class PhoneValidator {
  validate(
    row: Record<string, OutputData>,
    columnConfig: { column: string; regex?: string }[]
  ) {
    for (const columnToValidate of columnConfig.map((item) => item.column)) {
      let dataToValidate = row[columnToValidate];
      // check if defaultCountry DE is ok
      if (
        isPossiblePhoneNumber((dataToValidate.value as string) ?? "", "DE") ===
        false
      ) {
        row[columnToValidate].errors?.push({
          type: "phone",
          message: `value is not a valid phone number`,
        });
      }
    }
  }
}
