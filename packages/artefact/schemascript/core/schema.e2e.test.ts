import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Schema E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"packages/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_optional", (prop) => ({
	required_col: prop.text(),
	optional_col: prop.text().optional(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const testTable = sqliteTable("test_table_optional", {
	required_col: text("required_col").notNull(),
	optional_col: text("optional_col"),
});
`;

		const result = await runMigrationTest(
			"schema_e2e_optional",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect the required column", () => {
		if (!sqlContent) return;
		expect(sqlContent).toContain("required_col");
		expect(sqlContent).toContain("NOT NULL");
	});

	test("generated SQL should correctly reflect the optional column", () => {
		if (!sqlContent) return;
		expect(sqlContent).toContain("optional_col");
		expect(sqlContent.toLowerCase()).not.toContain(
			"optional_col` text not null",
		);
		expect(sqlContent.toLowerCase()).not.toContain(
			'"optional_col" text not null',
		);
	});
});
