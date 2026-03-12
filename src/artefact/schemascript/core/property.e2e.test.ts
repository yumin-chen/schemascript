import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runMigrationTest } from "../../../utils/testing/sql";

describe("Modifiers E2E (SQL Generation)", () => {
	let generatedSql = "";
	let cleanup: () => Promise<void>;

	beforeEach(async () => {
		const schemaContent = `
import { Table } from "@/artefact/schemascript";

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
		const result = await runMigrationTest("e2e-modifiers", schemaContent);
		generatedSql = result.sqlContent;
		cleanup = result.cleanup;
	});

	afterEach(async () => {
		if (cleanup) await cleanup();
	});

	test("drizzle-kit generate should produce valid SQL", () => {
		expect(generatedSql).toContain("`optional_field` text");
		expect(generatedSql).not.toContain("`optional_field` text NOT NULL");
		expect(generatedSql).toContain("`required_unique` text NOT NULL");
		expect(generatedSql).toContain(
			"CREATE UNIQUE INDEX `test_modifiers_required_unique_unique` ON `test_modifiers` (`required_unique`)",
		);
		expect(generatedSql).toContain(
			"`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL",
		);
		expect(generatedSql).toContain(
			"FOREIGN KEY (`parent_id`) REFERENCES `parent`(`id`) ON UPDATE no action ON DELETE cascade",
		);
		expect(generatedSql).toContain("`status` integer DEFAULT 1 NOT NULL");
		expect(generatedSql).toContain("`tags` blob NOT NULL");
	});
});
