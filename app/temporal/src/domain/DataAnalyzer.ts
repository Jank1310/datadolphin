import Fuse from "fuse.js";
import { ColumnConfig } from "./ColumnConfig";
import { ColumnValidation } from "./ColumnValidation";
import { DataSet } from "./DataSet";
import { ValidationMessage } from "./ValidationMessage";
import { ValidatorType, validators } from "./validators";

export interface DataMappingRecommendation {
  targetColumn: string | null;
  sourceColumn: string;
  confidence: number;
}

export type SourceFileStatsPerColumn = Record<
  string,
  { nonunique: Record<string, number> }
>;

export type ColumnValidators = Record<
  ValidatorType,
  { column: string; config: ColumnValidation }[]
>;

export class DataAnalyzer {
  constructor() {}

  public generateMappingRecommendations(
    sourceColumns: string[],
    targetColumns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const directMatchRecommendations = this.findDirectMappingMatches(
      sourceColumns,
      targetColumns
    );
    const missingColumns = sourceColumns.filter(
      (column) =>
        !directMatchRecommendations.find(
          (match) => match.sourceColumn === column
        )
    );
    const unmatchedTargetColumns = targetColumns.filter(
      (column) =>
        !directMatchRecommendations.find(
          (match) => match.targetColumn === column.key
        )
    );
    const fuzzyMatchRecommendations = this.findFuzzyMappingMatches(
      missingColumns,
      unmatchedTargetColumns
    );
    const foundColumnRecommendations = [
      ...directMatchRecommendations,
      ...fuzzyMatchRecommendations,
    ];
    const notFoundColumns = sourceColumns.filter(
      (column) =>
        !foundColumnRecommendations.find(
          (match) => match.sourceColumn === column
        )
    );
    const notFoundMatchRecommendations = notFoundColumns.map((column) => ({
      targetColumn: null,
      sourceColumn: column,
      confidence: 0,
    }));
    return [...foundColumnRecommendations, ...notFoundMatchRecommendations];
  }

  public processDataValidations(
    data: DataSet,
    validatorColumns: ColumnValidators,
    stats: SourceFileStatsPerColumn
  ): { rowId: number; column: string; messages: ValidationMessage[] }[] {
    const chunkMessages: {
      rowId: number;
      column: string;
      messages: ValidationMessage[];
    }[] = [];
    const validatorKeys = Object.keys(validatorColumns) as ValidatorType[];
    for (const row of data) {
      for (const validatorKey of validatorKeys) {
        if (validatorColumns[validatorKey].length > 0) {
          const messages = validators[validatorKey].validate(
            row,
            validatorColumns[validatorKey],
            stats
          );

          for (const column of Object.keys(messages as any)) {
            const message = messages[column] as any;
            const messageForRowAndColumn = chunkMessages.find(
              (item) =>
                item.rowId === row.__sourceRowId && item.column === column
            );
            if (messageForRowAndColumn) {
              messageForRowAndColumn.messages.push(message);
            } else {
              chunkMessages.push({
                rowId: row.__sourceRowId as number,
                column,
                messages: [message],
              });
            }
          }
        }
      }
    }
    return chunkMessages;
  }

  public getStats(
    data: DataSet,
    columnsToVerify: string[]
  ): SourceFileStatsPerColumn {
    // nonunique
    const stats = {} as SourceFileStatsPerColumn;
    for (const column of columnsToVerify) {
      const duplicates = new Map();
      data.forEach((row) => {
        if (!row.data[column]) {
          throw new Error(
            `Column ${column} not found in data rowId: ${row.__sourceRowId}`
          );
        }
        duplicates.set(
          row.data[column].value,
          (duplicates.get(row.data[column].value) ?? 0) + 1
        );
      });
      duplicates.forEach((value, key) => {
        if (value === 1) {
          duplicates.delete(key);
        }
      });

      stats[column] = { nonunique: Object.fromEntries(duplicates) };
    }
    return stats;
  }

  private findDirectMappingMatches(
    sourceColumns: string[],
    targetColumns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const directMatches: DataMappingRecommendation[] = [];
    for (const column of sourceColumns) {
      const directMatch = targetColumns.find(
        (targetColumn) =>
          targetColumn.key === column ||
          targetColumn.keyAlternatives?.includes(column)
      );
      if (directMatch) {
        const isAlreadyMapped = Boolean(
          directMatches.find((match) => match.targetColumn === directMatch?.key)
        );
        if (!isAlreadyMapped) {
          directMatches.push({
            targetColumn: directMatch.key,
            sourceColumn: column,
            confidence: 1,
          });
        }
      }
    }
    return directMatches;
  }

  private findFuzzyMappingMatches(
    sourceColumns: string[],
    targetColumns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const options: Fuse.IFuseOptions<ColumnConfig> = {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.7,
      keys: ["key", "keyAlternatives"],
    };
    const fuse = new Fuse<ColumnConfig>(targetColumns, options);
    const fuzzyMatches: DataMappingRecommendation[] = [];
    for (const column of sourceColumns) {
      let bestMatchForColumn: Fuse.FuseResult<ColumnConfig> | undefined;
      const result = fuse.search(column);
      if (result.length > 0) {
        bestMatchForColumn = result[0];
      }
      if (bestMatchForColumn) {
        const isAlreadyMapped = Boolean(
          fuzzyMatches.find(
            (match) => match.targetColumn === bestMatchForColumn?.item.key
          )
        );
        if (!isAlreadyMapped) {
          fuzzyMatches.push({
            targetColumn: bestMatchForColumn.item.key,
            sourceColumn: column,
            confidence: 1 - bestMatchForColumn.score!, // score = 0 == perfect match, score = 1 == worst match
          });
        }
      }
    }
    return fuzzyMatches;
  }
}
