import Fuse from "fuse.js";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { ColumnConfig } from "./ColumnConfig";
import { ColumnValidation } from "./ColumnValidation";
import { DataMapping } from "./DataMapping";

export interface DataMappingRecommendation {
  targetColumn: string;
  sourceColumn: string | null;
  confidence: number;
}

export interface OutputData {
  value: unknown;
  errors?: { type: ColumnValidation["type"]; message: string }[];
}

const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

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
    const data: Record<string, OutputData>[] = inputData.map((row) => {
      const newRow: Record<string, OutputData> = {};
      for (const key in row) {
        newRow[key] = { value: row[key], errors: [] };
      }
      return newRow;
    });
    for (const column of columns.filter(
      (column) => column.validations?.length
    )) {
      const columnToValidate = dataMapping.find(
        (item) => item.targetColumn === column.key
      );
      if (!columnToValidate) {
        console.error(
          `no mapping found for column ${column.key} - skipping validation`
        );
        continue;
      }
      for (const validation of column.validations!) {
        switch (validation.type) {
          case "unique":
            this.validateUnique(data, columnToValidate.sourceColumn);
            break;
          case "required":
            this.validateRequired(data, columnToValidate.sourceColumn);
            break;
          case "regex":
            if (!validation.regex) {
              throw new Error(`regex validation requires regex to be set`);
              continue;
            }
            this.validateRegex(
              data,
              columnToValidate.sourceColumn,
              validation.regex
            );
            break;
          case "phone":
            this.validatePhone(data, columnToValidate.sourceColumn);
            break;
          case "email":
            this.validateEmail(data, columnToValidate.sourceColumn);
            break;
        }
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

  private validateRequired(
    data: Record<string, OutputData>[],
    columnToValidate: string
  ) {
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      // create record if it doesn't exist
      if (!dataToValidate) {
        dataToValidate = { value: null, errors: [] };
        row[columnToValidate] = dataToValidate;
      }
      if (dataToValidate.value == null || dataToValidate.value === "") {
        row[columnToValidate].errors?.push({
          type: "required",
          message: "value is required",
        });
      }
    }
  }

  private validateUnique(
    data: Record<string, OutputData>[],
    columnToValidate: string
  ) {
    // create record if it doesn't exist
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      if (!dataToValidate) {
        dataToValidate = { value: null, errors: [] };
        row[columnToValidate] = dataToValidate;
      }
    }
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      if (
        data.filter(
          (item) => item[columnToValidate]?.value === dataToValidate.value
        ).length > 1
      ) {
        row[columnToValidate].errors?.push({
          type: "unique",
          message: "value is not unique",
        });
      }
    }
  }

  private validateRegex(
    data: Record<string, OutputData>[],
    columnToValidate: string,
    regex: string
  ) {
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      // create record if it doesn't exist
      if (!dataToValidate) {
        dataToValidate = { value: null, errors: [] };
        row[columnToValidate] = dataToValidate;
      }
      if (
        regex &&
        new RegExp(regex).test(dataToValidate.value as string) === false
      ) {
        row[columnToValidate].errors?.push({
          type: "regex",
          message: `value does not match regex ${regex}`,
        });
      }
    }
  }

  private validatePhone(
    data: Record<string, OutputData>[],
    columnToValidate: string
  ) {
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      // create record if it doesn't exist
      if (!dataToValidate) {
        dataToValidate = { value: null, errors: [] };
        row[columnToValidate] = dataToValidate;
      }
      // check if defaultCountry DE is ok
      if (
        isPossiblePhoneNumber((dataToValidate.value as string) ?? "", "DE") ===
        false
      ) {
        row[columnToValidate].errors?.push({
          type: "phone",
          message: `value is not a valid phone number`,
        });
      }
    }
  }

  private validateEmail(
    data: Record<string, OutputData>[],
    columnToValidate: string
  ) {
    for (const row of data) {
      let dataToValidate = row[columnToValidate];
      // create record if it doesn't exist
      if (!dataToValidate) {
        dataToValidate = { value: null, errors: [] };
        row[columnToValidate] = dataToValidate;
      }
      if (EMAIL_REGEX.test((dataToValidate.value as string) ?? "") === false) {
        row[columnToValidate].errors?.push({
          type: "email",
          message: `value is not a valid email`,
        });
      }
    }
  }
}
