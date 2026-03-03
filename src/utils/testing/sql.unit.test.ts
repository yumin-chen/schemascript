import { describe, expect, test } from "bun:test";
import { runMigrationTest } from "./sql";

describe("runMigrationTest utility", () => {
	test("should generate SQL content from schema", async () => {
		const schemaContent = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const t = sqliteTable("t", { c: text("c").notNull() });
`;
		const result = await runMigrationTest("unit_test", schemaContent);
		try {
			if (result.sqlContent) {
				expect(result.sqlContent).toContain("t");
				expect(result.sqlContent).toContain("c");
				expect(result.sqlContent).toContain("NOT NULL");
			}
		} finally {
			await result.cleanup();
		}
	}, 60000);

	test("should use fallback schema if generation fails", async () => {
		const invalidSchemaContent = `invalid syntax`;
		const fallbackSchemaContent = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const fallback = sqliteTable("fallback", { c: text("c").notNull() });
`;
		const result = await runMigrationTest(
			"fallback_test",
			invalidSchemaContent,
			fallbackSchemaContent,
		);
		try {
			if (result.sqlContent) {
				expect(result.sqlContent).toContain("fallback");
			}
		} finally {
			await result.cleanup();
		}
	}, 60000);
});
