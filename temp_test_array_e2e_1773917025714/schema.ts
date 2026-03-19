
import { Table } from "/app/src/artefact/schemascript/index.ts";

export const testTable = Table("test_table_array", (prop) => ({
	tags: prop.text().array(),
	ids: prop.integer().array(),
	flags: prop.boolean().array(),
	nodes: prop.node().array(),
	opt_tags: prop.text().array().optional(),
	def_tags: prop.text().array().default(["a", "b"]),
	roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
}));
