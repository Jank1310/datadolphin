import { ValidatorType } from "./validators";

export interface ColumnValidation {
  type: ValidatorType;
}

export interface RegexColumnValidation extends ColumnValidation {
  regex: string;
}

export interface EnumerationColumnValidation extends ColumnValidation {
  values: string[];
  canAddNewValues?: boolean;
}
