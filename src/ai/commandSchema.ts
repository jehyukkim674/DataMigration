export type AiAction =
  | "editCell" | "mergeColumns" | "splitColumn" | "splitColumnMap" | "newColumn"
  | "deleteColumn" | "renameColumn" | "replaceInColumn"
  | "filter" | "sort" | "hideColumn" | "clearView";

export interface AiCommand {
  action: AiAction;
  columnName?: string;
  columnNames?: string[];
  newColumnName?: string;
  separator?: string;
  /** splitColumnMap: 구분자로 나눈 뒤 조각 index를 컬럼명에 매핑(여기 없는 조각은 제외). */
  splitParts?: { index: number; name: string }[];
  find?: string;
  replaceWith?: string;
  regexFlag?: boolean;
  op?: string;
  value?: string;
  direction?: "asc" | "desc";
  row?: number;
}

export interface AiResult {
  commands: AiCommand[];
  reply?: string;
}

export const COMMAND_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "editCell", "mergeColumns", "splitColumn", "splitColumnMap", "newColumn",
              "deleteColumn", "renameColumn", "replaceInColumn", "filter", "sort", "hideColumn", "clearView",
            ],
          },
          find: { type: "string" },
          replaceWith: { type: "string" },
          regexFlag: { type: "boolean" },
          columnName: { type: "string" },
          columnNames: { type: "array", items: { type: "string" } },
          newColumnName: { type: "string" },
          separator: { type: "string" },
          splitParts: {
            type: "array",
            items: {
              type: "object",
              properties: { index: { type: "integer" }, name: { type: "string" } },
              required: ["index", "name"],
            },
          },
          op: { type: "string" },
          value: { type: "string" },
          direction: { type: "string", enum: ["asc", "desc"] },
          row: { type: "integer" },
        },
        required: ["action"],
      },
    },
    reply: { type: "string" },
  },
  required: ["commands"],
});
