import { ColumnConfig } from "./ColumnConfig";
import { DataAnalyzer, Stats } from "./DataAnalyzer";
import { ValidatorType } from "./validators";

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
      const rowsWithMissingName = [
        {
          __rowId: 0,
          name: "John",
        },
        { __rowId: 1 },
        { __rowId: 2, age: 25 },
        { __rowId: 3, name: "" },
        { __rowId: 4, name: null },
        { __rowId: 5, name: undefined },
      ];
      const validatorColumns = {
        required: [{ column: "name" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
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
        {
          rowId: 5,
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
        { __rowId: 3 },
        { __rowId: 4 },
        { __rowId: 5, name: "John" },
      ];
      const validatorColumns = {
        unique: [{ column: "name" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
      const stats: Stats = { name: { nonunique: { John: 3, undefined: 2 } } };
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
        { __rowId: 3 },
        { __rowId: 4, Postleitzahl: "123" },
      ];
      const validatorColumns = {
        regex: [{ column: "Postleitzahl", regex: "^[0-9]{5}$" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
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
        { __rowId: 4 },
      ];

      const validatorColumns = {
        phone: [{ column: "phone" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
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
        { __rowId: 5 },
      ];
      const validatorColumns = {
        email: [{ column: "email" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
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

    it("should validate multiple validations", () => {
      const rowsWithDuplicateValues = [{ __rowId: 0 }, { __rowId: 1 }];
      const validatorColumns = {
        required: [{ column: "name" }],
        unique: [{ column: "name" }],
        phone: [{ column: "name" }],
        email: [{ column: "name" }],
        regex: [{ column: "name", regex: "^[0-9]{5}$" }],
      } as Record<ValidatorType, { column: string; regex?: string }[]>;
      const stats: Stats = { name: { nonunique: { undefined: 2 } } };
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
