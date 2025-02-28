import type { ValidatorType } from "./validators";

export interface ValidationMessage {
	type: ValidatorType;
	message: string;
}
