import { describe, expect, test } from "bun:test";
import { Table } from "./table";
import { getTableColumns } from "drizzle-orm";

describe("Optional Modifier Integration", () => {
	test("should correctly map optional fields to nullable columns in Drizzle", () => {
		const TestTable = Table("test_optional", (prop) => ({
			required: prop.text(),
			optional: prop.text().optional(),
		}));

		const columns = getTableColumns(TestTable);

		expect(columns.required.notNull).toBe(true);
		expect(columns.optional.notNull).toBe(false);
	});
});
