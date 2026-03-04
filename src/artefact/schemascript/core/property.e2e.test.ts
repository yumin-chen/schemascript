import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { runMigrationTest } from "../../../utils/testing/sql";

describe("Modifiers E2E (SQL Generation)", () => {
	const tempDir = path.join(process.cwd(), "temp-e2e-modifiers");
	let generatedSql = "";

	beforeEach(async () => {
		const schemaContent = `
import { field, Table } from "../src/artefact/schemascript";

export const testTable = Table("test_modifiers", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
	required_unique: prop.text().unique(),
	optional_field: prop.text().optional(),
}));
`;
		generatedSql = await runMigrationTest(tempDir, schemaContent);
	});

	afterEach(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true });
		}
	});

	test("drizzle-kit generate should produce NULL for optional fields", () => {
		expect(generatedSql).toContain("`optional_field` text");
		expect(generatedSql).not.toContain("`optional_field` text NOT NULL");
	});

	test("drizzle-kit generate should produce NOT NULL for required fields", () => {
		expect(generatedSql).toContain("`required_unique` text NOT NULL");
	});

	test("drizzle-kit generate should produce UNIQUE index", () => {
		expect(generatedSql).toContain(
			"CREATE UNIQUE INDEX `test_modifiers_required_unique_unique` ON `test_modifiers` (`required_unique`)",
		);
	});

	test("drizzle-kit generate should produce PRIMARY KEY", () => {
		expect(generatedSql).toContain(
			"`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL",
		);
	});
});
