import { ColumnConfig } from "./ColumnConfig";
import { DataAnalyzer } from "./DataAnalyzer";

describe("DataAnalyzer", () => {
  const analyzer = new DataAnalyzer();
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
      key: "job",
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
    {
      key: "work role",
      label: "Role",
      type: "text",
    },
  ];

  it("should get correct mapping recommendations", () => {
    const sourceColumns: string[] = [
      "name",
      "name2",
      "age",
      "position",
      "mail",
      "role",
      "salry",
    ];

    const result = analyzer.generateMappingRecommendations(
      sourceColumns,
      columnConfigs
    );
    expect(result).toEqual([
      {
        sourceColumn: "name",
        targetColumn: "name",
        confidence: 1,
      },
      {
        sourceColumn: "age",
        targetColumn: "age",
        confidence: 1,
      },
      {
        sourceColumn: "position",
        targetColumn: "job",
        confidence: 1,
      },
      {
        sourceColumn: "mail",
        targetColumn: "email",
        confidence: 0.999,
      },
      {
        sourceColumn: "role",
        targetColumn: "work role",
        confidence: expect.closeTo(0.992431671049),
      },
      {
        sourceColumn: "salry",
        targetColumn: "salary",
        confidence: 0.8,
      },
      {
        sourceColumn: "name2",
        targetColumn: null,
        confidence: 0,
      },
    ]);
  });
});
