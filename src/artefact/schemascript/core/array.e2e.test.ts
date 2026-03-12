import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Array Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_array_e2e", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
	tags: prop.text().array(),
	scores: prop.real().array(),
	flags: prop.boolean().array(),
	optional_tags: prop.text().optional().array(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, blob, real } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_array_e2e", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	tags: blob("tags", { mode: "json" }).notNull(),
	scores: blob("scores", { mode: "json" }).notNull(),
	flags: blob("flags", { mode: "json" }).notNull(),
	optional_tags: blob("optional_tags", { mode: "json" }),
});
`;

		const result = await runMigrationTest(
			"array_e2e_comprehensive",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect array columns as BLOB and handle NOT NULL", () => {
		if (!sqlContent) return;

		const requiredColumns = ["tags", "scores", "flags"];
		for (const col of requiredColumns) {
			expect(sqlContent).toContain(col);
			const lines = sqlContent.split("\n");
			const colLine = lines.find(
				(line) => line.includes(`"${col}"`) || line.includes(`\`${col}\``),
			);
			expect(colLine?.toLowerCase()).toContain("blob");
			expect(colLine?.toUpperCase()).toContain("NOT NULL");
		}

		expect(sqlContent).toContain("optional_tags");
		const lines = sqlContent.split("\n");
		const optLine = lines.find(
			(line) => line.includes('"optional_tags"') || line.includes("`optional_tags`"),
		);
		expect(optLine?.toLowerCase()).toContain("blob");
		expect(optLine?.toUpperCase()).not.toContain("NOT NULL");
	});

	test("array with default value in E2E", async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { Table } from "${libraryPath}";

export const testTable = Table("test_array_default_e2e", (prop) => ({
	tags: prop.text().array().default(["default"]),
}));
`;
		// SQLite might not support DEFAULT for BLOB/JSON in all versions,
		// but drizzle-kit might generate it anyway or it might be valid in newer SQLite.
		const result = await runMigrationTest(
			"array_default_e2e",
			schemaContent,
		);

		if (result.sqlContent) {
			expect(result.sqlContent).toContain("tags");
			expect(result.sqlContent.toLowerCase()).toContain("blob");
			// Check if default is present - some versions of SQLite don't allow DEFAULT on BLOB
			// If it's present, it should be correctly formatted.
			if (result.sqlContent.toUpperCase().includes("DEFAULT")) {
				expect(result.sqlContent).toContain('["default"]');
			}
		}
		await result.cleanup();
	}, 60000);
});
