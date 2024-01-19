export interface ColumnConfig {
  name: string;
  type: "text" | "number" | "date";
  validation: unknown;
}
