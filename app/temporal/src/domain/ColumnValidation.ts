import { CountryCode } from "libphonenumber-js";
import { ValidatorType } from "./validators";

export interface ColumnValidation {
  type: ValidatorType;
}

export interface RegexColumnValidation extends ColumnValidation {
  type: "regex";
  regex: string;
}

export interface EnumerationColumnValidation extends ColumnValidation {
  type: "enum";
  values: string[];
}

export interface PhoneColumnValidation extends ColumnValidation {
  type: "phone";
  defaultCountry?: CountryCode;
}
