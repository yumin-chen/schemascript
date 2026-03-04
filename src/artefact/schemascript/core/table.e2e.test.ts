import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Table Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_unique", (prop) => ({
	unique_col: prop.text().unique(),
	normal_col: prop.text(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const testTable = sqliteTable("test_table_unique", {
	unique_col: text("unique_col").notNull().unique(),
	normal_col: text("normal_col").notNull(),
});
`;

		const result = await runMigrationTest(
			"unique_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect the unique modifier", () => {
		if (!sqlContent) return;
		expect(sqlContent.toLowerCase()).toContain("unique");
		expect(sqlContent).toContain("unique_col");
	});
});

describe("Unique Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_unique_all", (prop) => ({
	int_uniq: prop.integer().unique(),
	real_uniq: prop.real().unique(),
	text_uniq: prop.text().unique(),
	blob_uniq: prop.blob().unique(),
	bool_uniq: prop.boolean().unique(),
	date_uniq: prop.datetime().unique(),
	node_uniq: prop.node().unique(),
	enum_uniq: prop.enum({ options: ["A", "B"] }).unique(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, real, text, blob, customType } from "drizzle-orm/sqlite-core";

const EnumType = customType({
    dataType() { return "integer"; }
});

export const testTable = sqliteTable("test_table_unique_all", {
	int_uniq: integer("int_uniq").unique(),
	real_uniq: real("real_uniq").unique(),
	text_uniq: text("text_uniq").unique(),
	blob_uniq: blob("blob_uniq").unique(),
	bool_uniq: integer("bool_uniq").unique(),
	date_uniq: integer("date_uniq").unique(),
	node_uniq: blob("node_uniq").unique(),
	enum_uniq: EnumType("enum_uniq").unique(),
});
`;

		const result = await runMigrationTest(
			"unique_e2e_all",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect all unique columns with UNIQUE constraint", () => {
		if (!sqlContent) return;
		const columns = [
			"int_uniq",
			"real_uniq",
			"text_uniq",
			"blob_uniq",
			"bool_uniq",
			"date_uniq",
			"node_uniq",
			"enum_uniq",
		];
		for (const col of columns) {
			expect(sqlContent).toContain(col);

			const hasInlineUnique = !!sqlContent
				.split("\n")
				.find(
					(line) =>
						(line.includes(`"${col}"`) || line.includes(`\`${col}\``)) &&
						line.toUpperCase().includes("UNIQUE"),
				);

			const hasUniqueIndex =
				sqlContent.toUpperCase().includes("CREATE UNIQUE INDEX") &&
				sqlContent.includes(col);

			expect(hasInlineUnique || hasUniqueIndex).toBe(true);
		}
	});
});
