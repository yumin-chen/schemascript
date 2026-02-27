import { describe, expect, test } from "bun:test";
import { _$ } from "@/utils/dedent";
import { artefactSchema, artefactTable } from "./artefact";

describe("Artefact Schema", () => {
  test("should output the correct schema representation", () => {
    const schemaString = artefactSchema.toString();
    const schemaExpected = _$`
			Schema: Artefact
			{
			   text("name"),
			   integer("timestamp").default("now()")
			}`;
    expect(schemaString).toBe(schemaExpected);
  });
  test("should output the correct table representation", () => {
    const tableString = artefactTable.toString();
    const tableExpected = _$`
			Schema: Artefact
			{
			   text("name"),
			   integer("timestamp").default({"decoder":{},"shouldInlineParams":false,"usedTables":[],"queryChunks":[{"value":["CURRENT_TIMESTAMP"]}]})
			}`;
    expect(tableString).toBe(tableExpected);
  });
});
