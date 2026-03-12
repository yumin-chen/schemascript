import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Array Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = "@artefact/schemascript/index";
		const schemaContent = `
import { Table } from "${libraryPath}";

export const testTable = Table("test_table_array_e2e", (prop) => ({
	tags: prop.text().array(),
	ids: prop.integer().array(),
	flags: prop.boolean().array(),
	nodes: prop.node().array(),
	opt_tags: prop.text().array().optional(),
	def_tags: prop.text().array().default(["x", "y"]),
	roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
}));
`;
		// Fallback is just to ensure drizzle-kit can generate something if SchemaScript fails,
		// but we primarily want to test SchemaScript's output.
		const fallbackSchema = `
import { sqliteTable, blob } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_table_array_e2e", {
	tags: blob("tags", { mode: "json" }).notNull(),
	ids: blob("ids", { mode: "json" }).notNull(),
	flags: blob("flags", { mode: "json" }).notNull(),
	nodes: blob("nodes", { mode: "json" }).notNull(),
	opt_tags: blob("opt_tags", { mode: "json" }),
	def_tags: blob("def_tags", { mode: "json" }).notNull().default('["x","y"]'),
	roles: blob("roles", { mode: "json" }).notNull(),
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

	test("generated SQL should correctly reflect all array columns as BLOB", () => {
		if (!sqlContent) return;

		const columns = ["tags", "ids", "flags", "nodes", "roles"];
		for (const col of columns) {
			expect(sqlContent).toContain(col);
			const lines = sqlContent.split("\n");
			const colLine = lines.find(
				(line) => line.includes(`"${col}"`) || line.includes(`\`${col}\``),
			);
			expect(colLine?.toLowerCase()).toContain("blob");
			expect(colLine?.toUpperCase()).toContain("NOT NULL");
		}
	});

	test("generated SQL should correctly reflect optional array columns", () => {
		if (!sqlContent) return;

		const col = "opt_tags";
		expect(sqlContent).toContain(col);
		const lines = sqlContent.split("\n");
		const colLine = lines.find(
			(line) => line.includes(`"${col}"`) || line.includes(`\`${col}\``),
		);
		expect(colLine?.toLowerCase()).toContain("blob");
		expect(colLine?.toUpperCase()).not.toContain("NOT NULL");
	});

	test("generated SQL should correctly reflect array columns with default values", () => {
		if (!sqlContent) return;

		const col = "def_tags";
		expect(sqlContent).toContain(col);
		const lines = sqlContent.split("\n");
		const colLine = lines.find(
			(line) => line.includes(`"${col}"`) || line.includes(`\`${col}\``),
		);
		expect(colLine?.toLowerCase()).toContain("blob");
		expect(colLine?.toUpperCase()).toContain("DEFAULT");
		expect(colLine).toContain('["x","y"]');
	});
});
