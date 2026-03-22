import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runMigrationTest } from "@/utils/testing/sql";

describe("Table Registry E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table, table } from "${libraryPath}";

export const users = Table("users_registry_e2e", (prop) => ({
	id: prop.integer().identifier(),
	name: prop.text(),
}));

export const posts = Table("posts_registry_e2e", (prop) => ({
	id: prop.integer().identifier(),
	author_id: prop.integer().references(() => table("users_registry_e2e").id, { onDelete: "cascade" }),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users_registry_e2e", {
	id: integer("id").primaryKey(),
	name: text("name").notNull(),
});

export const posts = sqliteTable("posts_registry_e2e", {
	id: integer("id").primaryKey(),
	author_id: integer("author_id").references(() => users.id, { onDelete: "cascade" }),
});
`;

		const result = await runMigrationTest(
			"registry_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect references using table()", () => {
		if (!sqlContent) return;

		expect(sqlContent).toContain("CREATE TABLE `users_registry_e2e`");
		expect(sqlContent).toContain("CREATE TABLE `posts_registry_e2e`");
		expect(sqlContent).toContain("REFERENCES `users_registry_e2e`(`id`) ");
		expect(sqlContent).toContain("ON DELETE cascade");
	});
});

describe("Table Registry E2E - Forward Reference SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table, table } from "${libraryPath}";

// Reference 'profiles' before it's defined
export const users = Table("users_forward_e2e", (prop) => ({
	id: prop.integer().identifier(),
	profile_id: prop.integer().references(() => table("profiles_forward_e2e").id),
}));

export const profiles = Table("profiles_forward_e2e", (prop) => ({
	id: prop.integer().identifier(),
	bio: prop.text(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles_forward_e2e", {
	id: integer("id").primaryKey(),
	bio: text("bio").notNull(),
});

export const users = sqliteTable("users_forward_e2e", {
	id: integer("id").primaryKey(),
	profile_id: integer("profile_id").references(() => profiles.id),
});
`;

		const result = await runMigrationTest(
			"registry_forward_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect forward references using table()", () => {
		if (!sqlContent) return;

		expect(sqlContent).toContain("CREATE TABLE `users_forward_e2e`");
		expect(sqlContent).toContain("CREATE TABLE `profiles_forward_e2e`");
		expect(sqlContent).toContain("REFERENCES `profiles_forward_e2e`(`id`) ");
	});
});
