import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Table Integration", () => {
	test("should correctly map all unique primitive types to Drizzle columns", () => {
		const MyTable = Table("unique_integration", (prop) => ({
			int_uniq: prop.integer().unique(),
			real_uniq: prop.real().unique(),
			text_uniq: prop.text().unique(),
			blob_uniq: prop.blob().unique(),
			bool_uniq: prop.boolean().unique(),
			date_uniq: prop.datetime().unique(),
			node_uniq: prop.node().unique(),
			enum_uniq: prop.enum({ options: ["A", "B"] }).unique(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { isUnique: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_uniq.isUnique).toBe(true);
		expect(columns.real_uniq.isUnique).toBe(true);
		expect(columns.text_uniq.isUnique).toBe(true);
		expect(columns.blob_uniq.isUnique).toBe(true);
		expect(columns.bool_uniq.isUnique).toBe(true);
		expect(columns.date_uniq.isUnique).toBe(true);
		expect(columns.node_uniq.isUnique).toBe(true);
		expect(columns.enum_uniq.isUnique).toBe(true);
	});
});
