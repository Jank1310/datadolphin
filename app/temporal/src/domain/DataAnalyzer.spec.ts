import { ColumnConfig } from "./ColumnConfig";
import { DataAnalyzer } from "./DataAnalyzer";

describe("DataAnalyzer", () => {
  const analyzer = new DataAnalyzer();
  const rows: Record<string, string>[] = [
    { name: "John", age: "20", position: "CEO", mail: "john@gmail.com" },
    { name: "Jane", age: "30", position: "CTO" },
    { name: "Joe", age: "40", position: "COO", mail: "joe@gmail.com" },
  ];
  const columnConfigs: ColumnConfig[] = [
    {
      key: "name",
      label: "Name",
      type: "text",
    },
    {
      key: "age",
      label: "Age",
      type: "number",
    },
    {
      key: "role",
      keyAlternatives: ["position"],
      label: "Position",
      type: "text",
    },
    {
      key: "salary",
      label: "Salary",
      type: "number",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
    },
  ];

  it("should get correct mapping recommendations", () => {
    const result = analyzer.generateMappingRecommendations(rows, columnConfigs);
    expect(result).toEqual([
      {
        targetColumn: "name",
        sourceColumn: "name",
        confidence: 1,
      },
      {
        targetColumn: "age",
        sourceColumn: "age",
        confidence: 1,
      },
      {
        sourceColumn: "position",
        targetColumn: "role",
        confidence: 1,
      },
      {
        targetColumn: "email",
        sourceColumn: "mail",
        confidence: 0.8,
      },
      {
        targetColumn: "salary",
        sourceColumn: null,
        confidence: 0,
      },
    ]);
  });
});
