import Fuse from "fuse.js";
import type { ValidatorColumns } from "../activities";
import { ColumnConfig } from "./ColumnConfig";
import { ValidationError } from "./ValidationError";
import { ValidatorType, validators } from "./validators";

export interface DataMappingRecommendation {
  targetColumn: string | null;
  sourceColumn: string;
  confidence: number;
}

export type Stats = Record<string, { nonunique: Record<string, number> }>;

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
    data: Record<string, unknown>[],
    validatorColumns: ValidatorColumns,
    stats: Stats
  ): { rowId: number; column: string; errors: ValidationError[] }[] {
    const chunkErrors: {
      rowId: number;
      column: string;
      errors: ValidationError[];
    }[] = [];
    for (const row of data) {
      for (const validatorKey of Object.keys(
        validatorColumns
      ) as ValidatorType[]) {
        if (validatorColumns[validatorKey].length > 0) {
          const errors = validators[validatorKey].validate(
            row,
            validatorColumns[validatorKey],
            stats
          );

          for (const column of Object.keys(errors as any)) {
            const error = errors[column] as any;
            const errorForRowAndColumn = chunkErrors.find(
              (item) => item.rowId === row.__rowId && item.column === column
            );
            if (errorForRowAndColumn) {
              errorForRowAndColumn.errors.push(error);
            } else {
              chunkErrors.push({
                rowId: row.__rowId as number,
                column,
                errors: [error],
              });
            }
          }
        }
      }
    }
    return chunkErrors;
  }

  public getStats(
    data: Record<string, unknown>[],
    columnsToVerify: string[]
  ): Stats {
    // nonunique
    const stats = {} as Stats;
    for (const column of columnsToVerify) {
      const columnValues = data.map((row) => row[column]);
      const duplicates = this.countDuplicates(columnValues);
      stats[column] = { nonunique: duplicates };
    }
    return stats;
  }

  private countDuplicates(array: unknown[]): Record<string, number> {
    const counts = new Map();
    array.forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    counts.forEach((value, key) => {
      if (value === 1) {
        counts.delete(key);
      }
    });
    return Object.fromEntries(counts);
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
