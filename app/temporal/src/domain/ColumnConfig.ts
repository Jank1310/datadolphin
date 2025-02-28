import type { ColumnValidation } from "./ColumnValidation";

export interface ColumnConfig {
	key: string;
	label: string;
	/**
	 * If the column is a key, then this is the list of alternative keys that can be used to identify the column.
	 */
	keyAlternatives?: string[];
	type: "text" | "number" | "date";
	validations?: ColumnValidation[];
	multipleValues?: {
		/**
		 * @default false
		 */
		enabled?: boolean;
		/**
		 * @default ,
		 */
		delimiter?: string;
	};
}
