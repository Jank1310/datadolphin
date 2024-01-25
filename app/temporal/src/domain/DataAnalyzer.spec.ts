import { ColumnConfig } from "./ColumnConfig";
import {
  EnumerationColumnValidation,
  RegexColumnValidation,
} from "./ColumnValidation";
import {
  ColumnValidators,
  DataAnalyzer,
  SourceFileStatsPerColumn,
} from "./DataAnalyzer";

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

  describe("validation", () => {
    it("should validate required columns", () => {
      const rowsWithMissingName: Record<string, string | number | null>[] = [
        {
          __rowId: 0,
          name: "John",
        },
        { __rowId: 1 },
        { __rowId: 2, age: 25 },
        { __rowId: 3, name: "" },
        { __rowId: 4, name: null },
      ];
      const validatorColumns = {
        required: [{ column: "name", config: { type: "required" } }],
      } as ColumnValidators;
      const stats = {};
      const result = analyzer.processDataValidations(
        rowsWithMissingName,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 1,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
        {
          rowId: 2,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
        {
          rowId: 3,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
        {
          rowId: 4,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      ]);
    });

    it("should validate unique columns", () => {
      const rowsWithDuplicateValues = [
        {
          __rowId: 0,
          name: "John",
        },
        { __rowId: 1, name: "John" },
        { __rowId: 2, name: "Egon" },
        { __rowId: 3, name: "" },
        { __rowId: 4, name: "" },
        { __rowId: 5, name: "John" },
      ];
      const validatorColumns = {
        unique: [{ column: "name", config: { type: "unique" } }],
      } as ColumnValidators;
      const stats: SourceFileStatsPerColumn = {
        name: { nonunique: { John: 3, "": 2 } },
      };
      const result = analyzer.processDataValidations(
        rowsWithDuplicateValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 0,
          column: "name",
          errors: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: 1,
          column: "name",
          errors: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: 3,
          column: "name",
          errors: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: 4,
          column: "name",
          errors: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: 5,
          column: "name",
          errors: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
      ]);
    });

    it("should validate regex columns", () => {
      const rowsWithRegexValues = [
        {
          __rowId: 0,
          Postleitzahl: 90596,
        },
        { __rowId: 1, Postleitzahl: "90596" },
        { __rowId: 2, Postleitzahl: "x90596" },
        { __rowId: 3, Postleitzahl: "" },
        { __rowId: 4, Postleitzahl: "123" },
      ];
      const validatorColumns = {
        regex: [
          {
            column: "Postleitzahl",
            config: {
              type: "regex",
              regex: "^[0-9]{5}$",
            } as RegexColumnValidation,
          },
        ],
      } as ColumnValidators;
      const stats = {};
      const result = analyzer.processDataValidations(
        rowsWithRegexValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 2,
          column: "Postleitzahl",
          errors: [
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: 3,
          column: "Postleitzahl",
          errors: [
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: 4,
          column: "Postleitzahl",
          errors: [
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
      ]);
    });

    it("should validate phone columns", () => {
      const rowsWithPhoneValues = [
        {
          __rowId: 0,
          phone: "015140604777",
        },
        {
          __rowId: 1,
          phone: "0151/40604777",
        },
        { __rowId: 2, phone: "+49 151/40604777 " },
        { __rowId: 3, phone: "foo" },
        { __rowId: 4, phone: "" },
      ];

      const validatorColumns = {
        phone: [{ column: "phone", config: { type: "phone" } }],
      } as ColumnValidators;
      const stats = {};
      const result = analyzer.processDataValidations(
        rowsWithPhoneValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 3,
          column: "phone",
          errors: [
            {
              message: "value is not a valid phone number",
              type: "phone",
            },
          ],
        },
        {
          rowId: 4,
          column: "phone",
          errors: [
            {
              message: "value is not a valid phone number",
              type: "phone",
            },
          ],
        },
      ]);
    });

    it("should validate email columns", () => {
      const rowsWithEmailValues = [
        { __rowId: 0, email: "fiedlefl@gmail.com" },
        { __rowId: 1, email: "fiedlefl+test@gmail.com" },
        { __rowId: 2, email: "fiedlefl@gmail" },
        { __rowId: 3, email: "fiedlefl@gmail@test.com" },
        { __rowId: 4, email: "foo" },
        { __rowId: 5, email: "" },
      ];
      const validatorColumns = {
        email: [{ column: "email", config: { type: "email" } }],
      } as ColumnValidators;
      const stats = {};
      const result = analyzer.processDataValidations(
        rowsWithEmailValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 2,
          column: "email",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: 3,
          column: "email",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: 4,
          column: "email",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: 5,
          column: "email",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      ]);
    });

    it("should validate all validations", () => {
      const rowsWithDuplicateValues = [
        { __rowId: 0, uniques: "Jan" },
        { __rowId: 1, uniques: "Flo" },
      ];
      const validatorColumns = {
        required: [{ column: "name", config: { type: "required" } }],
        unique: [{ column: "name", config: { type: "unique" } }],
        phone: [{ column: "name", config: { type: "phone" } }],
        email: [{ column: "name", config: { type: "email" } }],
        regex: [
          {
            column: "name",
            config: {
              type: "regex",
              regex: "^[0-9]{5}$",
            } as RegexColumnValidation,
          },
        ],
        enum: [
          {
            column: "uniques",
            config: {
              type: "enum",
              values: ["Jan", "Florian"],
            } as EnumerationColumnValidation,
          },
        ],
      } as ColumnValidators;
      const stats: SourceFileStatsPerColumn = {
        name: { nonunique: { undefined: 2 } },
      };
      const result = analyzer.processDataValidations(
        rowsWithDuplicateValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: 0,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
            {
              message: "value is not unique",
              type: "unique",
            },

            {
              message: "value is not a valid phone number",
              type: "phone",
            },
            {
              message: "value is not a valid email",
              type: "email",
            },
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: 1,
          column: "name",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
            {
              message: "value is not unique",
              type: "unique",
            },

            {
              message: "value is not a valid phone number",
              type: "phone",
            },
            {
              message: "value is not a valid email",
              type: "email",
            },
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: 1,
          column: "uniques",
          errors: [
            {
              message: "value is not a valid enum",
              type: "enum",
            },
          ],
        },
      ]);
    });

    it("should validate enum values", () => {
      const rowsWithEmailValues = [
        { __rowId: 0, department: "Department 1" },
        { __rowId: 1, department: "Department 2" },
        { __rowId: 2, department: "Department 3" },
        { __rowId: 3, department: "" },
      ];
      const validatorColumns = {
        enum: [
          {
            column: "department",
            config: {
              type: "enum",
              values: ["Department 1", "Department 2"],
            } as EnumerationColumnValidation,
          },
        ],
      } as ColumnValidators;
      const stats = {};
      const result = analyzer.processDataValidations(
        rowsWithEmailValues,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          column: "department",
          rowId: 2,
          errors: [
            {
              message: "value is not a valid enum",
              type: "enum",
            },
          ],
        },
        {
          column: "department",
          errors: [
            {
              message: "value is not a valid enum",
              type: "enum",
            },
          ],
          rowId: 3,
        },
      ]);
    });
  });

  it("should return stats", () => {
    const jsonData = [
      {
        name: "Florian",
        id: 1,
      },
      {
        name: "Florian",
        id: 2,
      },
      {
        name: "Egon",
        id: 1,
      },
    ];
    const result = analyzer.getStats(jsonData, ["name", "id"]);
    expect(result).toEqual({
      id: { nonunique: { "1": 2 } },
      name: { nonunique: { Florian: 2 } },
    });
  });
});
