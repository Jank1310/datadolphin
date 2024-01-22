export interface ColumnValidation {
  type: "required" | "unique" | "regex" | "phone" | "email";
  regex?: string;
}
