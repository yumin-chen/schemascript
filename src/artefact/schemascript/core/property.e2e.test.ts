import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Modifiers E2E (SQL Generation)", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath =
			process.env.SCHEMASCRIPT_LIB_PATH ||
			join(process.cwd(), "src/artefact/schemascript/index.ts");
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const parent = Table("parent", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
}));

export const testTable = Table("test_modifiers", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
	parent_id: prop.integer().references(() => parent.id, { onDelete: 'cascade' }),
	required_unique: prop.text().unique(),
	optional_field: prop.text().optional(),
	status: prop.integer().default(1),
	tags: prop.text().array(),
}));
`;
		const result = await runMigrationTest("property_e2e", schemaContent);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("drizzle-kit generate should produce valid SQL", () => {
		expect(sqlContent).toContain("`optional_field` text");
		expect(sqlContent).not.toContain("`optional_field` text NOT NULL");
		expect(sqlContent).toContain("`required_unique` text NOT NULL");
		expect(sqlContent).toContain(
			"CREATE UNIQUE INDEX `test_modifiers_required_unique_unique` ON `test_modifiers` (`required_unique`)",
		);
		expect(sqlContent).toContain(
			"`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL",
		);
		expect(sqlContent).toContain(
			"FOREIGN KEY (`parent_id`) REFERENCES `parent`(`id`) ON UPDATE no action ON DELETE cascade",
		);
		expect(sqlContent).toContain("`status` integer DEFAULT 1 NOT NULL");
		expect(sqlContent).toContain("`tags` blob NOT NULL");
	});
});
