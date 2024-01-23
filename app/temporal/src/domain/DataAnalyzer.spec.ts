import { ColumnConfig } from "./ColumnConfig";
import { DataAnalyzer } from "./DataAnalyzer";
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

  it("should validate required columns", () => {
    const rowsWithMissingName = [
      {
        name: "John",
      },
      {},
      { age: 25 },
      { name: "" },
      { name: null },
      { name: undefined },
    ];
    const validatorColumns = {
      required: [{ column: "name" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithMissingName,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      { name: { value: "John", errors: [] } },
      {
        name: {
          value: undefined,
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      },
      {
        name: {
          value: undefined,
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      },
      {
        name: {
          value: "",
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      },
      {
        name: {
          value: null,
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      },
      {
        name: {
          value: undefined,
          errors: [
            {
              message: "value is required",
              type: "required",
            },
          ],
        },
      },
    ]);
  });

  it("should validate unique columns", () => {
    const rowsWithDuplicateValues = [
      {
        name: "John",
      },
      { name: "John" },
      { name: "Egon" },
      {},
      {},
      { name: "John" },
    ];
    const validatorColumns = {
      unique: [{ column: "name" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      {
        name: {
          value: "John",
          errors: [
            {
              type: "unique",
              message: "value is not unique",
            },
          ],
        },
      },
      {
        name: {
          value: "John",
          errors: [
            {
              type: "unique",
              message: "value is not unique",
            },
          ],
        },
      },
      { name: { value: "Egon", errors: [] } },
      {
        name: {
          value: undefined,
          errors: [
            {
              type: "unique",
              message: "value is not unique",
            },
          ],
        },
      },
      {
        name: {
          value: undefined,
          errors: [
            {
              type: "unique",
              message: "value is not unique",
            },
          ],
        },
      },
      {
        name: {
          value: "John",
          errors: [
            {
              type: "unique",
              message: "value is not unique",
            },
          ],
        },
      },
    ]);
  });

  it("should validate regex columns", () => {
    const rowsWithDuplicateValues = [
      {
        Postleitzahl: 90596,
      },
      { Postleitzahl: "90596" },
      { Postleitzahl: "x90596" },
      {},
      { Postleitzahl: "123" },
    ];
    const validatorColumns = {
      regex: [{ column: "Postleitzahl", regex: "^[0-9]{5}$" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [
      { sourceColumn: "Postleitzahl", targetColumn: "Postleitzahl" },
    ];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      {
        Postleitzahl: {
          value: 90596,
          errors: [],
        },
      },
      {
        Postleitzahl: {
          value: "90596",
          errors: [],
        },
      },
      {
        Postleitzahl: {
          value: "x90596",
          errors: [
            {
              type: "regex",
              message: `value does not match regex ^[0-9]{5}$`,
            },
          ],
        },
      },
      {
        Postleitzahl: {
          value: undefined,
          errors: [
            {
              type: "regex",
              message: `value does not match regex ^[0-9]{5}$`,
            },
          ],
        },
      },
      {
        Postleitzahl: {
          value: "123",
          errors: [
            {
              type: "regex",
              message: `value does not match regex ^[0-9]{5}$`,
            },
          ],
        },
      },
    ]);
  });

  it("should validate phone columns", () => {
    const rowsWithDuplicateValues = [
      {
        phone: "015140604777",
      },
      {
        phone: "0151/40604777",
      },
      { phone: "+49 151/40604777 " },
      { phone: "foo" },
      {},
    ];

    const validatorColumns = {
      phone: [{ column: "phone" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [{ sourceColumn: "phone", targetColumn: "phone" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      {
        phone: {
          value: "015140604777",
          errors: [],
        },
      },
      {
        phone: {
          value: "0151/40604777",
          errors: [],
        },
      },
      {
        phone: {
          value: "+49 151/40604777 ",
          errors: [],
        },
      },
      {
        phone: {
          value: "foo",
          errors: [
            {
              message: "value is not a valid phone number",
              type: "phone",
            },
          ],
        },
      },
      {
        phone: {
          value: undefined,
          errors: [
            {
              message: "value is not a valid phone number",
              type: "phone",
            },
          ],
        },
      },
    ]);
  });

  it("should validate email columns", () => {
    const rowsWithDuplicateValues = [
      {
        email: "fiedlefl@gmail.com",
      },
      {
        email: "fiedlefl+test@gmail.com",
      },
      {
        email: "fiedlefl@gmail",
      },
      {
        email: "fiedlefl@gmail@test.com",
      },
      {
        email: "foo",
      },
      {},
    ];
    const validatorColumns = {
      email: [{ column: "email" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [{ sourceColumn: "email", targetColumn: "email" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      {
        email: { value: "fiedlefl@gmail.com", errors: [] },
      },
      {
        email: { value: "fiedlefl+test@gmail.com", errors: [] },
      },
      {
        email: {
          value: "fiedlefl@gmail",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      },
      {
        email: {
          value: "fiedlefl@gmail@test.com",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      },
      {
        email: {
          value: "foo",
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      },
      {
        email: {
          value: undefined,
          errors: [
            {
              message: "value is not a valid email",
              type: "email",
            },
          ],
        },
      },
    ]);
  });

  it("should validate multiple validations", () => {
    const rowsWithDuplicateValues = [{}, {}];
    const validatorColumns = {
      required: [{ column: "name" }],
      unique: [{ column: "name" }],
      phone: [{ column: "name" }],
      email: [{ column: "name" }],
      regex: [{ column: "name", regex: "^[0-9]{5}$" }],
    } as Record<ValidatorType, { column: string; regex?: string }[]>;
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      mapping,
      validatorColumns
    );
    expect(result).toEqual([
      {
        name: {
          value: undefined,
          errors: expect.arrayContaining([
            {
              message: "value is not unique",
              type: "unique",
            },
            {
              message: "value is required",
              type: "required",
            },
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },

            {
              message: "value is not a valid phone number",
              type: "phone",
            },
            {
              message: "value is not a valid email",
              type: "email",
            },
          ]),
        },
      },
      {
        name: {
          value: undefined,
          errors: expect.arrayContaining([
            {
              message: "value is not unique",
              type: "unique",
            },
            {
              message: "value is required",
              type: "required",
            },
            {
              message: "value does not match regex ^[0-9]{5}$",
              type: "regex",
            },

            {
              message: "value is not a valid phone number",
              type: "phone",
            },
            {
              message: "value is not a valid email",
              type: "email",
            },
          ]),
        },
      },
    ]);
  });
});
