import { ValidatorType } from "./validators";

export interface ValidationError {
  type: ValidatorType;
  message: string;
}
