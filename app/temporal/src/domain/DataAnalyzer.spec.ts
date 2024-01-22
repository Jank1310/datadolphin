import { ColumnConfig } from "./ColumnConfig";
import { DataAnalyzer } from "./DataAnalyzer";

describe("DataAnalyzer", () => {
  const analyzer = new DataAnalyzer();
  const rows: Record<string, string>[] = [
    {
      name: "John",
      age: "20",
      position: "CEO",
      mail: "john@gmail.com",
      role: "Lead",
    },
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
        targetColumn: "job",
        confidence: 1,
      },
      {
        targetColumn: "email",
        sourceColumn: "mail",
        confidence: 0.8,
      },
      {
        sourceColumn: "role",
        targetColumn: "work role",
        confidence: expect.closeTo(0.4444444),
      },
      {
        targetColumn: "salary",
        sourceColumn: null,
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "name",
        label: "Name",
        type: "text",
        validations: [{ type: "required" }],
      },
    ];
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithMissingName,
      columnConfigs,
      mapping
    );
    expect(result).toEqual([
      { name: { value: "John", errors: [] } },
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
        age: {
          value: 25,
          errors: [],
        },
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "name",
        label: "Name",
        type: "text",
        validations: [{ type: "unique" }],
      },
    ];
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      columnConfigs,
      mapping
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
          value: null,
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
          value: null,
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "postalCode",
        label: "PostalCode",
        type: "text",
        validations: [{ type: "regex", regex: "^[0-9]{5}$" }],
      },
    ];
    const mapping = [
      { sourceColumn: "Postleitzahl", targetColumn: "postalCode" },
    ];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      columnConfigs,
      mapping
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
          value: null,
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "phone",
        label: "phone",
        type: "text",
        validations: [{ type: "phone" }],
      },
    ];
    const mapping = [{ sourceColumn: "phone", targetColumn: "phone" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      columnConfigs,
      mapping
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
          value: null,
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "email",
        label: "email",
        type: "text",
        validations: [{ type: "email" }],
      },
    ];
    const mapping = [{ sourceColumn: "email", targetColumn: "email" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      columnConfigs,
      mapping
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
          value: null,
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
    const columnConfigs: ColumnConfig[] = [
      {
        key: "name",
        label: "name",
        type: "text",
        validations: [
          { type: "required" },
          { type: "unique" },
          { type: "phone" },
          { type: "email" },
          { type: "regex", regex: "^[0-9]{5}$" },
        ],
      },
    ];
    const mapping = [{ sourceColumn: "name", targetColumn: "name" }];
    const result = analyzer.processDataValidations(
      rowsWithDuplicateValues,
      columnConfigs,
      mapping
    );
    expect(result).toEqual([
      {
        name: {
          value: null,
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
      },
      {
        name: {
          value: null,
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
      },
    ]);
  });
});
