import Fuse from "fuse.js";
import { ColumnConfig } from "./ColumnConfig";
import { ColumnValidation } from "./ColumnValidation";
import { DataMapping } from "./DataMapping";
import { validators } from "./validators";

export interface DataMappingRecommendation {
  targetColumn: string;
  sourceColumn: string | null;
  confidence: number;
}

export interface OutputData {
  value: unknown;
  errors?: { type: ColumnValidation["type"]; message: string }[];
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

  processDataValidations(
    inputData: Record<string, unknown>[],
    columns: ColumnConfig[],
    dataMapping: DataMapping[]
  ): Record<string, OutputData>[] {
    const data = this.applyDataMapping(inputData, dataMapping);

    const allColumnsWithValidators = columns.filter(
      (column) => column.validations?.length
    );
    const uniqueValidators = [];
    const requiredValidators = [];
    const regexValidators = [];
    const phoneValidators = [];
    const emailValidators = [];

    for (const column of allColumnsWithValidators) {
      for (const validator of column.validations!) {
        switch (validator.type) {
          case "unique":
            uniqueValidators.push({ column: column.key });
            break;
          case "required":
            requiredValidators.push({ column: column.key });
            break;
          case "regex":
            regexValidators.push({
              column: column.key,
              regex: validator.regex,
            });
            break;
          case "phone":
            phoneValidators.push({ column: column.key });
            break;
          case "email":
            emailValidators.push({ column: column.key });
            break;
        }
      }
    }

    for (const row of data) {
      if (uniqueValidators.length > 0) {
        validators.unique.validate(
          row,
          data,
          uniqueValidators.map((item) => item.column)
        );
      }

      if (requiredValidators.length > 0) {
        validators.required.validate(
          row,
          requiredValidators.map((item) => item.column)
        );
      }

      if (regexValidators.length > 0) {
        validators.regex.validate(row, regexValidators);
      }

      if (phoneValidators.length > 0) {
        validators.phone.validate(
          row,
          phoneValidators.map((item) => item.column)
        );
      }

      if (emailValidators.length > 0) {
        validators.email.validate(
          row,
          emailValidators.map((item) => item.column)
        );
      }
    }
    return data;
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
    const options: Fuse.IFuseOptions<string> = {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.7,
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
      if (bestMatchForColumn) {
        fuzzyMatches.push({
          targetColumn: column.key,
          sourceColumn: bestMatchForColumn.item,
          confidence: 1 - bestMatchForColumn.score!, // score = 0 == perfect match, score = 1 == worst match
        });
      }
    }
    return fuzzyMatches;
  }

  private applyDataMapping(
    inputData: Record<string, unknown>[],
    dataMapping: DataMapping[]
  ): Record<string, OutputData>[] {
    return inputData.map((row) => {
      const newRow: Record<string, OutputData> = {};
      newRow.__rowId = row.__rowId as OutputData;
      for (const mapping of dataMapping) {
        if (mapping.sourceColumn) {
          newRow[mapping.targetColumn] = {
            value: row[mapping.sourceColumn],
            errors: [],
          };
        } else {
          newRow[mapping.targetColumn] = { value: null, errors: [] };
        }
      }
      return newRow;
    });
  }
}
