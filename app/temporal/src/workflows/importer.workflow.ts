import {
	ApplicationFailure,
	CancellationScope,
	CancelledFailure,
	condition,
	continueAsNew,
	defineQuery,
	defineSignal,
	defineUpdate,
	isCancellation,
	proxyActivities,
	setHandler,
	sleep,
	workflowInfo,
} from "@temporalio/workflow";
import env from "env-var";
import { difference, keyBy, mapValues, sum, times } from "lodash";
import pLimit from "p-limit";
import type { makeActivities } from "../activities";
import type { ColumnConfig } from "../domain/ColumnConfig";
import type {
	ColumnValidation,
	EnumerationColumnValidation,
} from "../domain/ColumnValidation";
import type {
	ColumnValidators,
	DataMappingRecommendation,
} from "../domain/DataAnalyzer";
import type { DataSetPatch } from "../domain/DataSet";
import type { ValidationMessage } from "../domain/ValidationMessage";
export interface ImporterWorkflowParams {
	name: string;
	description?: string;
	meta: Record<string, string>;
	columnConfig: ColumnConfig[];
	callbackUrl: string;
	/**
	 * Timeout for upload of file.
	 * If not set, defaults to 24 hours.
	 */
	uploadTimeout?: string;
	/**
	 * Timeout for the start of the import.
	 * If not set, defaults to 24 hours.
	 */
	startImportTimeout?: string;
	logo: string;
	design?: {
		primaryColor?: string;
		primaryForegroundColor?: string;
		menuBackgroundColor?: string;
		menuForegroundColor?: string;
	};
}

export type ImporterState =
	| "select-file"
	| "mapping"
	| "validate"
	| "importing"
	| "closed";
export interface ImporterStatus {
	isValidatingData: boolean;
	state: ImporterState;
	totalRows: number;
	dataMapping: Mapping[] | null;
	meta: Meta | null;
	isProcessingSourceFile: boolean;
	isMappingData: boolean;
}

export interface Mapping {
	targetColumn: string | null;
	sourceColumn: string;
}

export interface Meta {
	messageCount: Record<string /* columnId */, number>;
}

const addFileUpdate = defineUpdate<
	void,
	[
		{
			fileReference: string;
			fileFormat: "csv" | "xlsx";
			bucketPrefix: string;
			delimiter: string;
		},
	]
>("importer:add-file");
const startImportSignal = defineUpdate<void, []>("importer:start-import");
const closeSignal = defineSignal("importer:close");
const importStatusQuery = defineQuery<ImporterStatus>("importer:status");
const dataMappingRecommendationsQuery = defineQuery<
	DataMappingRecommendation[] | null
>("importer:data-mapping-recommendations");
const importerConfigQuery =
	defineQuery<ImporterWorkflowParams>("importer:config");
const mappingUpdate = defineUpdate<
	void,
	[
		{
			mappings: Mapping[];
		},
	]
>("importer:update-mapping");
const recordUpdate = defineUpdate<
	{
		/**
		 * means that the whole column might have changes
		 */
		changedColumns: string[];
		newMessagesByColumn: Record<string /* columnId */, ValidationMessage[]>;
	},
	[{ patches: DataSetPatch[] }]
>("importer:update-record");
const columnValidationUpdate = defineUpdate<
	void,
	[
		{
			columnConfigKey: string;
			columnValidation: ColumnValidation;
		},
	]
>("importer:update-column-validation");
const triggerColumnValidation = defineUpdate<
	{
		changedColumns: string[];
	},
	string[] /* columnKey */
>("importer:trigger-column-validation");
const resetImporter = defineSignal<[]>("importer:reset");

const acts = proxyActivities<ReturnType<typeof makeActivities>>({
	startToCloseTimeout: "5 minute",
});

const validationParallelLimit = env
	.get("VALIDATION_PARALLEL_LIMIT")
	.default(10)
	.asIntPositive();
/**
 * Entity workflow which represents a complete importer workflow
 */
export async function importer(params: ImporterWorkflowParams) {
	const uploadTimeout = params.uploadTimeout ?? "24 hours";
	const startImportTimeout = params.startImportTimeout ?? "24 hours";
	const callbackCancellationScope = new CancellationScope();
	let columnConfig = mergeEnumValidations(params.columnConfig);
	let sourceFile: {
		fileReference: string;
		fileFormat: "csv" | "xlsx";
		delimiter: string;
	} | null = null;
	let dataMappingRecommendations: DataMappingRecommendation[] | null = null;
	let configuredMappings: Mapping[] | null = null;
	let totalRows = 0;
	let meta: Meta | null = null;
	const changedEnums: Record<string, { action: "added"; value: string }[]> = {};

	// progress states
	let state: ImporterState = "select-file";
	let isValidating = false;
	let isProcessingSourceFile = false;
	let isMappingData = false;
	let isUpdatingRecord = false;
	/** DEFINE WORKFLOW HANDLERS */
	setHandler(resetImporter, async () => {
		if (state !== "closed" && state !== "importing") {
			await continueAsNew(params);
		}
	});
	setHandler(closeSignal, () => {
		if (state === "importing") {
			state = "closed";
			callbackCancellationScope.cancel();
		}
	});
	setHandler(
		addFileUpdate,
		(params) => {
			sourceFile = {
				fileReference: params.fileReference,
				fileFormat: params.fileFormat,
				delimiter: params.delimiter,
			};
		},
		{
			validator: (_params) => {
				return !sourceFile;
			},
		},
	);
	setHandler(
		mappingUpdate,
		(params) => {
			configuredMappings = params.mappings;
		},
		{
			validator: (_params) => {
				return !configuredMappings;
			},
		},
	);
	setHandler(
		recordUpdate,
		async (updateParams) => {
			if (isUpdatingRecord) {
				await condition(() => !isUpdatingRecord);
			}
			isUpdatingRecord = true;
			try {
				await acts.applyPatches({
					importerId: workflowInfo().workflowId,
					patches: updateParams.patches,
				});

				const changedColumns: string[] = [];
				const newMessages: Record<string, ValidationMessage[]> = {};

				for (const patch of updateParams.patches) {
					const _columnConfig = columnConfig.find(
						(item) => item.key === patch.column,
					);
					if (!_columnConfig) {
						continue;
					}
					const columnValidations = _columnConfig.validations;

					if (columnValidations?.length) {
						const validationResults = await performRecordValidation(
							[_columnConfig],
							patch.rowId,
						);
						const validationResultsGroupedByColumn = mapValues(
							keyBy(validationResults, "column"),
							"messages",
						);
						newMessages[patch.column] =
							validationResultsGroupedByColumn[patch.column] || [];
						if (columnValidations.find((item) => item.type === "unique")) {
							// unique validation
							const changedColumnsForValidator = await performValidations([
								_columnConfig,
							]);
							changedColumns.push(...changedColumnsForValidator);
						}
					}
				}
				return {
					changedColumns,
					newMessagesByColumn: newMessages,
				};
			} finally {
				isUpdatingRecord = false;
			}
		},
		{
			validator: (params) => {
				return params.patches.length > 0;
			},
		},
	);
	setHandler(
		startImportSignal,
		() => {
			if (state === "validate") {
				state = "importing";
			}
		},
		{
			validator: () => {
				const totalMessageCount = sum(Object.values(meta?.messageCount ?? {}));
				if (totalMessageCount > 0) {
					throw new ApplicationFailure(
						"Import not allowed due to existing messages",
					);
				}
			},
		},
	);
	setHandler(columnValidationUpdate, (params) => {
		columnConfig = columnConfig.map((column) => {
			if (column.key === params.columnConfigKey) {
				return {
					...column,
					validations: column.validations?.map((validation) => {
						if (validation.type === params.columnValidation.type) {
							if (params.columnValidation.type === "enum") {
								const newEnumValidation =
									params.columnValidation as EnumerationColumnValidation;
								const currentEnumValidation =
									validation as EnumerationColumnValidation;
								const addedEnums = difference(
									newEnumValidation.values,
									currentEnumValidation.values,
								);
								changedEnums[column.key] = [
									...(changedEnums[column.key] || []),
									...addedEnums.map((value) => ({
										action: "added" as const,
										value,
									})),
								];
								return {
									...validation,
									values: newEnumValidation.values,
								};
							}
							return params.columnValidation;
						}
						return validation;
					}),
				};
			}
			return column;
		});
	});
	setHandler(triggerColumnValidation, async (columnKeys) => {
		const changedColumns: string[] = [];
		for (const columnKey of columnKeys) {
			const config = columnConfig.find((item) => item.key === columnKey);
			if (!config) {
				continue;
			}
			const changedColumnsForValidator = await performValidations([config]);
			changedColumns.push(...changedColumnsForValidator);
		}
		return {
			changedColumns,
		};
	});
	setHandler(importerConfigQuery, () => {
		return { ...params, columnConfig };
	});
	setHandler(dataMappingRecommendationsQuery, () => {
		return dataMappingRecommendations ?? null;
	});

	setHandler(importStatusQuery, () => {
		return {
			state,
			isValidatingData: isValidating,
			dataMapping: configuredMappings,
			totalRows,
			meta,
			isProcessingSourceFile,
			isMappingData,
			changedEnums,
		};
	});

	const importerId = workflowInfo().workflowId;

	/** BUSINESS LOGIC */

	try {
		// step 1: wait for and process source file
		const hasSourceFile = await condition(
			() => sourceFile !== null,
			uploadTimeout,
		);
		if (!hasSourceFile) {
			throw ApplicationFailure.nonRetryable(
				"Timeout: source file not uploaded",
			);
		}
		await processSourceFile();
		// step 2: data mapping recommendation and user selection
		state = "mapping";
		const hasConfiguredMappings = await condition(
			() => configuredMappings !== null,
			startImportTimeout,
		);
		if (!hasConfiguredMappings) {
			throw ApplicationFailure.nonRetryable("Timeout: mappings not configured");
		}
		isMappingData = true;
		await acts.applyMappings({
			importerId,
			dataMapping: configuredMappings ?? [],
		});
		// initial validations for new mapped data
		const allMappedColumnsWithValidators = columnConfig.filter(
			(column) =>
				column.validations?.length &&
				(configuredMappings ?? []).find(
					(mapping) => mapping.targetColumn === column.key,
				),
		);
		await performValidations(allMappedColumnsWithValidators);
		isMappingData = false;

		// step 3: data validation
		state = "validate";
		// step 4: start import
		const hasImportStartRequested = await condition(
			() => state === "importing",
			startImportTimeout,
		);
		if (!hasImportStartRequested) {
			throw ApplicationFailure.nonRetryable(
				"Timeout: import start not requested",
			);
		}
		try {
			await callbackCancellationScope.run(async () => {
				const currentStatus = {
					state,
					isValidatingData: isValidating,
					dataMapping: configuredMappings,
					totalRows,
					meta,
					isProcessingSourceFile,
					isMappingData,
					changedEnums,
				};
				await acts.invokeCallback({
					importerId,
					callbackUrl: params.callbackUrl,
					status: currentStatus,
				});
			});
		} catch (err) {
			if (!(err instanceof CancelledFailure)) {
				throw err;
			}
		}

		await sleep(
			"14 days", // internal max lifetime
		);
	} catch (err) {
		if (isCancellation(err)) {
			await CancellationScope.nonCancellable(() => cleanUp());
		}
		throw err; // <-- Fail the workflow
	} finally {
		// <-- Wont be called on cancellation or termination!
		await cleanUp();
	}

	async function cleanUp() {
		if (sourceFile) {
			await acts.deleteFiles({ prefix: importerId });
		}
		await acts.dropDatabase({ importerId });
	}

	async function performValidations(columnConfigs: ColumnConfig[]) {
		await condition(() => !isValidating);
		isValidating = true;

		const columnValidators = {} as ColumnValidators;
		for (const column of columnConfigs) {
			for (const validator of column.validations ?? []) {
				if (!columnValidators[validator.type]) {
					columnValidators[validator.type] = [];
				}
				columnValidators[validator.type].push({
					column: column.key,
					config: validator,
				});
			}
		}
		const { columnStats, totalCount } = await acts.generateStatsPerColumn({
			importerId,
			uniqueColumns: columnValidators.unique?.map((item) => item.column) ?? [],
		});
		//! Optimize import limit
		const limitFct = pLimit(validationParallelLimit);
		const limit = 5000;
		const validationRecordChunks = Math.ceil(totalCount / limit);
		const parallelValidations = times(validationRecordChunks, (chunkIndex) =>
			limitFct(() => {
				return acts.processDataValidations({
					importerId,
					columnValidators,
					stats: columnStats,
					skip: chunkIndex * limit,
					limit,
				});
			}),
		);
		const affectedColumns = await Promise.all(parallelValidations);

		meta = await acts.generateMeta({ importerId });
		isValidating = false;
		return affectedColumns.flat();
	}

	async function performRecordValidation(
		columnConfigs: ColumnConfig[],
		rowId: string,
	) {
		if (isValidating) {
			await condition(() => !isValidating);
		}
		isValidating = true;
		try {
			const columnValidators = {} as ColumnValidators;
			for (const column of columnConfigs) {
				for (const validator of column.validations ?? []) {
					if (!columnValidators[validator.type]) {
						columnValidators[validator.type] = [];
					}
					columnValidators[validator.type].push({
						column: column.key,
						config: validator,
					});
				}
			}
			const { columnStats } = await acts.generateStatsPerColumn({
				importerId,
				uniqueColumns:
					columnValidators.unique?.map((item) => item.column) ?? [],
			});
			const validationResults = await acts.processDataValidationForRecord({
				importerId,
				columnValidators,
				stats: columnStats,
				rowId,
			});
			meta = await acts.generateMeta({ importerId });
			return validationResults;
		} finally {
			isValidating = false;
		}
	}

	async function processSourceFile() {
		isProcessingSourceFile = true;
		if (!sourceFile) {
			throw new ApplicationFailure("No source file provided");
		}
		totalRows = await acts.processSourceFile({
			importerId,
			fileReference: sourceFile.fileReference,
			format: sourceFile.fileFormat,
			formatOptions: {
				delimiter: sourceFile.delimiter,
			},
		});
		dataMappingRecommendations = await acts.getMappingRecommendations({
			importerId,
			columnConfig: columnConfig,
		});
		isProcessingSourceFile = false;
	}
}

function mergeEnumValidations(configs: ColumnConfig[]): ColumnConfig[] {
	return configs.map((config) => {
		if (config.validations) {
			const enumValidations = config.validations.filter(
				(val) => val.type === "enum",
			) as EnumerationColumnValidation[];
			if (enumValidations.length > 1) {
				const mergedValues = Array.from(
					new Set(enumValidations.flatMap((val) => val.values || [])),
				);
				const canAddNewValues = enumValidations.some(
					(val) => val.canAddNewValues,
				);
				const mergedValidation: EnumerationColumnValidation = {
					type: "enum",
					values: mergedValues,
					canAddNewValues,
				};
				// Remove all enum validations
				const filteredValidations = config.validations.filter(
					(val) => val.type !== "enum",
				);
				// Add the merged enum validation
				filteredValidations.push(mergedValidation);
				return { ...config, validations: filteredValidations };
			}
		}
		return config;
	});
}
