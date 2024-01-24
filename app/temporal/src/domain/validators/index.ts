import { ColumnValidation } from "../ColumnValidation";
import { SourceFileStatsPerColumn } from "../DataAnalyzer";
import { ValidationError } from "../ValidationError";
import { EmailValidator } from "./EmailValidator";
import { EnumValidator } from "./EnumValidator";
import { PhoneValidator } from "./PhoneValidator";
import { RegexValidator } from "./RegexValidator";
import { RequiredValidator } from "./RequiredValidator";
import { UniqueValidator } from "./UniqueValidator";

export const validators: Record<string, Validator> = {
  unique: new UniqueValidator(),
  required: new RequiredValidator(),
  regex: new RegexValidator(),
  phone: new PhoneValidator(),
  email: new EmailValidator(),
  enum: new EnumValidator(),
};

export type ValidatorType = keyof typeof validators;

export interface Validator {
  validate(
    row: Record<string, string | number | null>,
    columnConfigs: { column: string; config: ColumnValidation }[],
    stats: SourceFileStatsPerColumn
  ): Record<string, ValidationError>;
}
