import { ValidatorType } from "./validators";

export interface ColumnValidation {
  type: ValidatorType;
  regex?: string;
}
