
import { field, Table } from "/app/src/artefact/schemascript/index.ts";

export const testTable = Table("test_table_optional", (prop) => ({
	required_col: prop.text(),
	optional_col: prop.text().optional(),
}));
