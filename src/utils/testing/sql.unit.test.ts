import { describe, expect, test } from "bun:test";
import { runMigrationTest } from "./sql";

describe("runMigrationTest utility", () => {
	test("should generate SQL content from schema", async () => {
		const schemaContent = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const t = sqliteTable("t", { c: text("c").notNull() });
`;
		const sqlContent = await runMigrationTest("unit_test", schemaContent);
		expect(sqlContent).toContain("t");
		expect(sqlContent).toContain("c");
		expect(sqlContent).toContain("NOT NULL");
	}, 60000);
});
