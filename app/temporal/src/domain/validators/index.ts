import type { ColumnValidation } from "../ColumnValidation";
import type { SourceFileStatsPerColumn } from "../DataAnalyzer";
import type { DataSetRow } from "../DataSet";
import type { ValidationMessage } from "../ValidationMessage";
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
		row: DataSetRow,
		columnConfigs: { column: string; config: ColumnValidation }[],
		stats: SourceFileStatsPerColumn,
	): Record<string, ValidationMessage>;
}
