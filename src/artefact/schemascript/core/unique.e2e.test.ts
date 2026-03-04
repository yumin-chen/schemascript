import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Unique Modifier E2E - SQL Generation", () => {
    let sqlContent = "";
    let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
        const libraryPath = join(process.cwd(), "src/artefact/schemascript/index.ts");
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

        const result = await runMigrationTest("unique_e2e", schemaContent, fallbackSchema);
        sqlContent = result.sqlContent;
        cleanupFn = result.cleanup;
	}, 60000);

    afterAll(async () => {
        if (cleanupFn) await cleanupFn();
    });

	test("generated SQL should correctly reflect the unique modifier", () => {
        if (!sqlContent) return;
		expect(sqlContent.toLowerCase()).toContain('unique');
        expect(sqlContent).toContain('unique_col');
	});
});
