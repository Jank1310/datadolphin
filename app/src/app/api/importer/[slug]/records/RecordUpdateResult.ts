import { ValidationMessages } from "../ImporterDto";

export type RecordUpdateResult = {
  /**
   * means that the whole column might have changes
   */
  changedColumns: string[];
  newMessagesByColumn: Record<string /* columnId */, ValidationMessages[]>;
};
