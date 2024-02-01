import { ObjectId } from "mongodb";
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
import { DataSetRow } from "./DataSet";

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
      const rowsWithMissingName: DataSetRow[] = [
        {
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: {
            name: { value: "John", messages: [] },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: {
            name: { value: "", messages: [] },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: {
            name: { value: null, messages: [] },
          },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1b"),
          column: "name",
          messages: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1c"),
          column: "name",
          messages: [
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
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: {
            name: {
              value: "John",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: {
            name: {
              value: "John",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: {
            name: {
              value: "Egon",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1d"),
          __sourceRowId: 3,
          data: {
            name: {
              value: "",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1e"),
          __sourceRowId: 4,
          data: {
            name: {
              value: "",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1f"),
          __sourceRowId: 5,
          data: {
            name: {
              value: "John",
              messages: [],
            },
          },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1a"),
          column: "name",
          messages: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1b"),
          column: "name",
          messages: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1d"),
          column: "name",
          messages: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1e"),
          column: "name",
          messages: [
            {
              message: "value is not unique",
              type: "unique",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1f"),
          column: "name",
          messages: [
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
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: {
            Postleitzahl: {
              value: 90596,
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: {
            Postleitzahl: {
              value: "90596",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: {
            Postleitzahl: {
              value: "x90596",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1d"),
          __sourceRowId: 3,
          data: {
            Postleitzahl: {
              value: "",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1e"),
          __sourceRowId: 4,
          data: {
            Postleitzahl: {
              value: "123",
              messages: [],
            },
          },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1c"),
          column: "Postleitzahl",
          messages: [
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1d"),
          column: "Postleitzahl",
          messages: [
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1e"),
          column: "Postleitzahl",
          messages: [
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
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: {
            phone: {
              value: "015140604777",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: {
            phone: {
              value: "0151/40604777",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: {
            phone: {
              value: "+49 151/40604777 ",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1d"),
          __sourceRowId: 3,
          data: {
            phone: {
              value: "foo",
              messages: [],
            },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1e"),
          __sourceRowId: 4,
          data: {
            phone: {
              value: "",
              messages: [],
            },
          },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1d"),
          column: "phone",
          messages: [
            {
              message: "value is not a valid phone number",
              type: "phone",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1e"),
          column: "phone",
          messages: [
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
        {
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: { email: { value: "fiedlefl@gmail.com", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: { email: { value: "fiedlefl+test@gmail.com", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: { email: { value: "fiedlefl@gmail", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1d"),
          __sourceRowId: 3,
          data: { email: { value: "fiedlefl@gmail@test.com", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1e"),
          __sourceRowId: 4,
          data: { email: { value: "foo", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1f"),
          __sourceRowId: 5,
          data: { email: { value: "", messages: [] } },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1c"),
          column: "email",
          messages: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1d"),
          column: "email",
          messages: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1e"),
          column: "email",
          messages: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
        {
          rowId: new ObjectId("65b39818ab8b36794717db1f"),
          column: "email",
          messages: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      ]);
    });

    it("should validate all validations", () => {
      const rows = [
        {
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: {
            name: { value: "", messages: [] },
            uniques: { value: "Jan", messages: [] },
          },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: {
            name: { value: "", messages: [] },
            uniques: { value: "Flo", messages: [] },
          },
        },
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
        name: { nonunique: { "": 2 } },
      };
      const result = analyzer.processDataValidations(
        rows,
        validatorColumns,
        stats
      );
      expect(result).toEqual([
        {
          rowId: new ObjectId("65b39818ab8b36794717db1a"),
          column: "name",
          messages: [
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
          rowId: new ObjectId("65b39818ab8b36794717db1b"),
          column: "name",
          messages: [
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
          rowId: new ObjectId("65b39818ab8b36794717db1b"),
          column: "uniques",
          messages: [
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
        {
          _id: new ObjectId("65b39818ab8b36794717db1a"),
          __sourceRowId: 0,
          data: { department: { value: "Department 1", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1b"),
          __sourceRowId: 1,
          data: { department: { value: "Department 2", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1c"),
          __sourceRowId: 2,
          data: { department: { value: "Department 3", messages: [] } },
        },
        {
          _id: new ObjectId("65b39818ab8b36794717db1d"),
          __sourceRowId: 3,
          data: { department: { value: "", messages: [] } },
        },
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
          rowId: new ObjectId("65b39818ab8b36794717db1c"),
          messages: [
            {
              message: "value is not a valid enum",
              type: "enum",
            },
          ],
        },
        {
          column: "department",
          rowId: new ObjectId("65b39818ab8b36794717db1d"),
          messages: [
            {
              message: "value is not a valid enum",
              type: "enum",
            },
          ],
        },
      ]);
    });
  });
});
