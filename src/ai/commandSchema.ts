export type AiAction =
  | "editCell" | "mergeColumns" | "splitColumn" | "newColumn"
  | "deleteColumn" | "renameColumn"
  | "filter" | "sort" | "hideColumn" | "clearView";

export interface AiCommand {
  action: AiAction;
  columnName?: string;
  columnNames?: string[];
  newColumnName?: string;
  separator?: string;
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
              "editCell", "mergeColumns", "splitColumn", "newColumn",
              "deleteColumn", "renameColumn", "filter", "sort", "hideColumn", "clearView",
            ],
          },
          columnName: { type: "string" },
          columnNames: { type: "array", items: { type: "string" } },
          newColumnName: { type: "string" },
          separator: { type: "string" },
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
