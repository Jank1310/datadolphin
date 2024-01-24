import { EmailValidator } from "./EmailValidator";
import { PhoneValidator } from "./PhoneValidator";
import { RegexValidator } from "./RegexValidator";
import { RequiredValidator } from "./RequiredValidator";
import { UniqueValidator } from "./UniqueValidator";

export const validators = {
  unique: new UniqueValidator(),
  required: new RequiredValidator(),
  regex: new RegexValidator(),
  phone: new PhoneValidator(),
  email: new EmailValidator(),
};

export type ValidatorType = keyof typeof validators;
