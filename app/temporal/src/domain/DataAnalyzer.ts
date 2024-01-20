import Fuse from "fuse.js";
import { ColumnConfig } from "./ColumnConfig";

export interface DataMappingRecommendation {
  targetColumn: string;
  sourceColumn: string | null;
  confidence: number;
}

export class DataAnalyzer {
  constructor() {}

  public generateMappingRecommendations(
    data: Record<string, unknown>[],
    columns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const availableSourceColumns = new Set<string>();
    for (const row of data) {
      for (const key of Object.keys(row)) {
        availableSourceColumns.add(key);
      }
    }
    const directMatchRecommendations = this.findDirectMappingMatches(
      availableSourceColumns,
      columns
    );
    const missingColumns = columns.filter(
      (column) =>
        !directMatchRecommendations.find(
          (match) => match.targetColumn === column.key
        )
    );
    const fuzzyMatchRecommendations = this.findFuzzyMappingMatches(
      availableSourceColumns,
      missingColumns
    );
    const foundColumnRecommendations = [
      ...directMatchRecommendations,
      ...fuzzyMatchRecommendations,
    ];
    const notFoundColumns = columns.filter(
      (column) =>
        !foundColumnRecommendations.find(
          (match) => match.targetColumn === column.key
        )
    );
    const notFoundMatchRecommendations = notFoundColumns.map((column) => ({
      targetColumn: column.key,
      sourceColumn: null,
      confidence: 0,
    }));
    return [...foundColumnRecommendations, ...notFoundMatchRecommendations];
  }

  private findDirectMappingMatches(
    availableSourceColumns: Set<string>,
    columns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const directMatches: DataMappingRecommendation[] = [];
    for (const column of columns) {
      if (availableSourceColumns.has(column.key)) {
        directMatches.push({
          targetColumn: column.key,
          sourceColumn: column.key,
          confidence: 1,
        });
      } else if (column.keyAlternatives) {
        for (const keyAlternative of column.keyAlternatives) {
          if (availableSourceColumns.has(keyAlternative)) {
            directMatches.push({
              targetColumn: column.key,
              sourceColumn: keyAlternative,
              confidence: 1,
            });
          }
        }
      }
    }
    return directMatches;
  }

  private findFuzzyMappingMatches(
    availableSourceColumns: Set<string>,
    columns: ColumnConfig[]
  ): DataMappingRecommendation[] {
    const options = {
      includeScore: true,
    };
    const fuse = new Fuse(Array.from(availableSourceColumns), options);
    const fuzzyMatches: DataMappingRecommendation[] = [];
    for (const column of columns) {
      let bestMatchForColumn: Fuse.FuseResult<string> | undefined;
      const result = fuse.search(column.key);
      if (result.length > 0) {
        bestMatchForColumn = result[0];
      }
      if (column.keyAlternatives) {
        for (const keyAlternative of column.keyAlternatives) {
          const result = fuse.search(keyAlternative);
          if (result.length === 0) {
            continue;
          }
          if (
            !bestMatchForColumn ||
            result[0].score! < bestMatchForColumn.score!
          ) {
            bestMatchForColumn = result[0];
          }
        }
      }
      if (bestMatchForColumn && bestMatchForColumn.score! < 0.5) {
        fuzzyMatches.push({
          targetColumn: column.key,
          sourceColumn: bestMatchForColumn.item,
          confidence: 1 - bestMatchForColumn.score!, // score = 0 == perfect match, score = 1 == worst match
        });
      }
    }
    return fuzzyMatches;
  }
}
