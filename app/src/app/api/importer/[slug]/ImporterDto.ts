import type { CountryCode } from "libphonenumber-js";

export interface ImporterDto {
	importerId: string;
	config: ImporterConfig;
	status: ImporterStatus;
}

export interface ImporterConfig {
	callbackUrl: string;
	columnConfig: ColumnConfig[];
	/**
	 * Timeout for upload of file.
	 * If not set, defaults to 24 hours.
	 */
	uploadTimeout?: string;
	/**
	 * Timeout for the start of the import.
	 * If not set, defaults to 24 hours.
	 */
	startImportTimeout?: string;
	name: string;
	description?: string;
	meta: Record<string, string>;
	logo: string;
	/**
	 * if set a button will be shown to redirect to this url
	 */
	redirectUrl?: string;
	design?: {
		primaryColor?: string;
		primaryForegroundColor?: string;
		menuBackgroundColor?: string;
		menuForegroundColor?: string;
	};
}

export type ImporterState =
	| "select-file"
	| "mapping"
	| "validate"
	| "importing"
	| "closed";

export interface ImporterStatus {
	isValidatingData: boolean;
	state: ImporterState;
	totalRows: number;
	dataMapping: DataMapping[] | null;
	meta: Meta | null;
	isProcessingSourceFile: boolean;
	isMappingData: boolean;
}
export interface Meta {
	messageCount: Record<string /* columnId */, number>;
}
export interface DataMappingRecommendation {
	targetColumn: string | null;
	sourceColumn: string;
	confidence: number;
}

export interface ColumnConfig {
	key: string;
	label: string;
	/**
	 * If the column is a key, then this is the list of alternative keys that can be used to identify the column.
	 */
	keyAlternatives?: string[];
	type: "text" | "number" | "date";
	validations?: ColumnValidation[];
}

export interface ColumnValidation {
	type: "unique" | "regex" | "enum" | "required" | "phone" | "email";
}

export interface RegexColumnValidation extends ColumnValidation {
	type: "regex";
	regex: string;
}

export interface EnumerationColumnValidation extends ColumnValidation {
	type: "enum";
	values: string[];
	canAddNewValues?: boolean;
}

export interface PhoneColumnValidation extends ColumnValidation {
	type: "phone";
	defaultCountry?: CountryCode;
}

export interface DataMapping {
	targetColumn: string | null;
	sourceColumn: string;
}

export interface DataSetPatch {
	rowId: number;
	/**
	 * target column
	 */
	column: string;
	previousValue?: string | number | null;
	newValue: string | number | null;
}

export interface DataValidation {
	rowId: number;
	column: string;
	errors: ValidationMessages[];
}

export interface ValidationMessages {
	type: "required" | "unique" | "regex" | "phone" | "email";
	message: string;
}

export type ColumnName = string;
// TODO rename to DataRecord?
export type SourceData = {
	_id: string;
	__sourceRowId: number;
	data: Record<ColumnName, CellValue>;
};

export interface CellValue {
	value: string | number | null;
	messages: ValidationMessages[];
}
