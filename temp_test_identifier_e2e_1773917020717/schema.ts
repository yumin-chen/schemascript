
import { field, Table } from "/app/src/artefact/schemascript/index.ts";

export const testTable = Table("test_table_identifier", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
	code: prop.text().unique(),
}));
