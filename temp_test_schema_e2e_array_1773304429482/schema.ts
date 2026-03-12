
import { field, Table } from "/app/src/artefact/schemascript/index.ts";

export const testTable = Table("test_table_array", (prop) => ({
	tags: prop.text().array(),
	scores: prop.real().array().optional(),
}));
