import { ObjectId } from "mongodb";
import type { ColumnConfig } from "./ColumnConfig";
import type {
	EnumerationColumnValidation,
	PhoneColumnValidation,
	RegexColumnValidation,
} from "./ColumnValidation";
import {
	type ColumnValidators,
	DataAnalyzer,
	type SourceFileStatsPerColumn,
} from "./DataAnalyzer";
import type { DataSetRow } from "./DataSet";

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
			key: "roles",
			label: "Multiple roles",
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
			columnConfigs,
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
				targetColumn: "roles",
				confidence: expect.closeTo(0.999),
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
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1b",
					column: "name",
					messages: [
						{
							message: "value is required",
							type: "required",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1c",
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
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1a",
					column: "name",
					messages: [
						{
							message: "value is not unique",
							type: "unique",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1b",
					column: "name",
					messages: [
						{
							message: "value is not unique",
							type: "unique",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1f",
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
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1c",
					column: "Postleitzahl",
					messages: [
						{
							message: "value does not match regex ^[0-9]{5}$",
							type: "regex",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1e",
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
				{
					_id: new ObjectId("65b39818ab8b36794717db1f"),
					__sourceRowId: 5,
					data: {
						phone: {
							value: "1-719-894-8096", // wrong country
							messages: [],
						},
					},
				},
			];

			const validatorColumns = {
				phone: [
					{
						column: "phone",
						config: {
							type: "phone",
							defaultCountry: "DE",
						} as PhoneColumnValidation,
					},
				],
			} as ColumnValidators;
			const stats = {};
			const result = analyzer.processDataValidations(
				rowsWithPhoneValues,
				validatorColumns,
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1d",
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

		it("should invalidate if no default country is set for phone validation", () => {
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
			];

			const validatorColumns = {
				phone: [
					{
						column: "phone",
						config: { type: "phone" } as PhoneColumnValidation,
					},
				],
			} as ColumnValidators;
			const stats = {};
			const result = analyzer.processDataValidations(
				rowsWithPhoneValues,
				validatorColumns,
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1a",
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
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1c",
					column: "email",
					messages: [
						{
							message: "value is not a valid email",
							type: "email",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1d",
					column: "email",
					messages: [
						{
							message: "value is not a valid email",
							type: "email",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1e",
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
				stats,
			);
			expect(result).toEqual([
				{
					rowId: "65b39818ab8b36794717db1a",
					column: "name",
					messages: [
						{
							message: "value is required",
							type: "required",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1b",
					column: "name",
					messages: [
						{
							message: "value is required",
							type: "required",
						},
					],
				},
				{
					rowId: "65b39818ab8b36794717db1b",
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
			const rowsWithValues = [
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
				rowsWithValues,
				validatorColumns,
				stats,
			);
			expect(result).toEqual([
				{
					column: "department",
					rowId: "65b39818ab8b36794717db1c",
					messages: [
						{
							message: "value is not a valid enum",
							type: "enum",
						},
					],
				},
			]);
		});

		describe("multiple values", () => {
			it("should validate multiple roles", () => {
				const multipleValues = [
					{
						_id: new ObjectId("65b39818ab8b36794717db1a"),
						__sourceRowId: 0,
						data: {
							role: {
								value: ["user", "admin-x"],
								messages: [],
							},
						},
					},
					{
						_id: new ObjectId("65b39818ab8b36794717db1f"),
						__sourceRowId: 1,
						data: { role: { value: ["user"], messages: [] } },
					},
					{
						_id: new ObjectId("65b39818ab8b36794717dbaa"),
						__sourceRowId: 2,
						data: { role: { value: [], messages: [] } },
					},
				];
				const validatorColumns = {
					enum: [
						{
							column: "role",
							config: {
								type: "enum",
								values: ["admin", "user"],
							} as EnumerationColumnValidation,
						},
					],
					required: [{ column: "role", config: { type: "required" } }],
				} as ColumnValidators;
				const stats = {};
				const result = analyzer.processDataValidations(
					multipleValues,
					validatorColumns,
					stats,
				);
				expect(result).toEqual([
					{
						rowId: "65b39818ab8b36794717db1a",
						column: "role",
						messages: [
							{
								message: "value is not a valid enum: admin-x",
								type: "enum",
							},
						],
					},
					{
						rowId: "65b39818ab8b36794717dbaa",
						column: "role",
						messages: [
							{
								message: "value is required",
								type: "required",
							},
						],
					},
				]);
			});
		});
	});
});
