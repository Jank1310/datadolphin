import Fuse from "fuse.js";
import { ColumnConfig } from "./ColumnConfig";

export interface DataMappingRecommendation {
  targetColumn: string | null;
  sourceColumn: string;
  confidence: number;
}

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