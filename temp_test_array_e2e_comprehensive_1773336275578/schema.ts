
import { Table } from "@artefact/schemascript/index";

export const testTable = Table("test_table_array_e2e", (prop) => ({
	tags: prop.text().array(),
	ids: prop.integer().array(),
	flags: prop.boolean().array(),
	nodes: prop.node().array(),
	opt_tags: prop.text().array().optional(),
	def_tags: prop.text().array().default(["x", "y"]),
	roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
}));
