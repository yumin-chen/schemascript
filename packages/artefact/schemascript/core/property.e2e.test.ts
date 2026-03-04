import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Modifiers E2E (SQL Generation)", () => {
	const tempDir = path.join(process.cwd(), "temp-e2e-modifiers");
	let generatedSql = "";

	beforeEach(async () => {
		const schemaContent = `
import { field, Table } from "../packages/artefact/schemascript";

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
		generatedSql = await runMigrationTest(tempDir, schemaContent);
	});

	afterEach(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true });
		}
	});

	test("drizzle-kit generate should produce valid SQL", () => {
		expect(generatedSql).toContain("`optional_field` text");
		expect(generatedSql).not.toContain("`optional_field` text NOT NULL");
		expect(generatedSql).toContain("`required_unique` text NOT NULL");
		expect(generatedSql.toLowerCase()).toContain("unique");
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
