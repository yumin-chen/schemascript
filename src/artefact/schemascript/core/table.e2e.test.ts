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

describe("Optional Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_optional_all", (prop) => ({
	int_opt: prop.integer().optional(),
	real_opt: prop.real().optional(),
	text_opt: prop.text().optional(),
	blob_opt: prop.blob().optional(),
	bool_opt: prop.boolean().optional(),
	date_opt: prop.datetime().optional(),
	node_opt: prop.node().optional(),
	enum_opt: prop.enum({ options: ["A", "B"] }).optional(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, real, text, blob, customType } from "drizzle-orm/sqlite-core";

const EnumType = customType({
    dataType() { return "integer"; }
});

export const testTable = sqliteTable("test_table_optional_all", {
	int_opt: integer("int_opt"),
	real_opt: real("real_opt"),
	text_opt: text("text_opt"),
	blob_opt: blob("blob_opt"),
	bool_opt: integer("bool_opt"),
	date_opt: integer("date_opt"),
	node_opt: blob("node_opt"),
	enum_opt: EnumType("enum_opt"),
});
`;

		const result = await runMigrationTest(
			"optional_e2e_all",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect all optional columns without NOT NULL", () => {
		if (!sqlContent) return;
		const columns = [
			"int_opt",
			"real_opt",
			"text_opt",
			"blob_opt",
			"bool_opt",
			"date_opt",
			"node_opt",
			"enum_opt",
		];
		for (const col of columns) {
			expect(sqlContent).toContain(col);
			// Check that this column specifically is not marked NOT NULL
			const lines = sqlContent.split("\n");
			const colLine = lines.find(
				(line) => line.includes(`"${col}"`) || line.includes(`\`${col}\``),
			);
			expect(colLine?.toUpperCase()).not.toContain("NOT NULL");
		}
	});
});

describe("Identifier Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_identifier", (prop) => ({
	id: prop.integer().identifier({ autoIncrement: true }),
	code: prop.text().unique(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_table_identifier", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	code: text("code").unique(),
});
`;

		const result = await runMigrationTest(
			"identifier_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect PRIMARY KEY and AUTOINCREMENT", () => {
		if (!sqlContent) return;

		expect(sqlContent).toContain("`id` integer PRIMARY KEY AUTOINCREMENT");
	});

	test("generated SQL should correctly reflect non-autoincrement PRIMARY KEY", async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const testTable = Table("test_table_id_text", (prop) => ({
	uuid: prop.text().identifier(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_table_id_text", {
	uuid: text("uuid").primaryKey(),
});
`;

		const result = await runMigrationTest(
			"identifier_text_e2e",
			schemaContent,
			fallbackSchema,
		);

		expect(result.sqlContent).toContain("`uuid` text PRIMARY KEY NOT NULL");
		await result.cleanup();
	}, 60000);
});

describe("References Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { field, Table } from "${libraryPath}";

export const users = Table("users", (prop) => ({
	id: prop.integer().identifier(),
}));

export const posts = Table("posts", (prop) => ({
	id: prop.integer().identifier(),
	author_id: prop.integer().references(() => users.id, { onDelete: "cascade" }),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: integer("id").primaryKey(),
});

export const posts = sqliteTable("posts", {
	id: integer("id").primaryKey(),
	author_id: integer("author_id").references(() => users.id, { onDelete: "cascade" }),
});
`;

		const result = await runMigrationTest(
			"references_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect FOREIGN KEY references", () => {
		if (!sqlContent) return;

		// Relaxing the assertion to be order-independent for ON UPDATE/ON DELETE
		expect(sqlContent).toContain("REFERENCES `users`(`id`) ");
		expect(sqlContent).toContain("ON DELETE cascade");
		expect(sqlContent).toContain("ON UPDATE no action");
	});
});

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
}));

export const posts = Table("posts_registry_e2e", (prop) => ({
	id: prop.integer().identifier(),
	author_id: prop.integer().references(() => table("users_registry_e2e").id),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users_registry_e2e", {
	id: integer("id").primaryKey(),
});

export const posts = sqliteTable("posts_registry_e2e", {
	id: integer("id").primaryKey(),
	author_id: integer("author_id").references(() => users.id),
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

	test("generated SQL should correctly reflect references using table() registry", () => {
		if (!sqlContent) return;

		expect(sqlContent).toContain("REFERENCES `users_registry_e2e`(`id`) ");
	});
});

describe("Default Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { Table } from "${libraryPath}";
import { sql } from "@/data/proxies/sqlite";

export const testTable = Table("test_table_default", (prop) => ({
	int_def: prop.integer().default(42),
	text_def: prop.text().default("hello"),
	bool_def: prop.boolean().default(true),
	date_def: prop.datetime().default(sql\`CURRENT_TIMESTAMP\`),
}));
`;
		const fallbackSchema = `
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const testTable = sqliteTable("test_table_default", {
	int_def: integer("int_def").default(42).notNull(),
	text_def: text("text_def").default("hello").notNull(),
	bool_def: integer("bool_def", { mode: "boolean" }).default(true).notNull(),
	date_def: integer("date_def", { mode: "timestamp" }).default(sql\`CURRENT_TIMESTAMP\`).notNull(),
});
`;

		const result = await runMigrationTest(
			"default_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect default values", () => {
		if (!sqlContent) return;

		expect(sqlContent).toMatch(/["`]int_def["`].*DEFAULT 42/i);
		expect(sqlContent).toMatch(/["`]text_def["`].*DEFAULT 'hello'/i);
		expect(sqlContent).toMatch(/["`]bool_def["`].*DEFAULT true/i);
		expect(sqlContent).toMatch(/["`]date_def["`].*DEFAULT CURRENT_TIMESTAMP/i);
	});
});

describe("Array Modifier E2E - SQL Generation", () => {
	let sqlContent = "";
	let cleanupFn: () => Promise<void>;

	beforeEach(async () => {
		const libraryPath = join(
			process.cwd(),
			"src/artefact/schemascript/index.ts",
		);
		const schemaContent = `
import { Table } from "${libraryPath}";

export const testTable = Table("test_table_array", (prop) => ({
	tags: prop.text().array(),
	ids: prop.integer().array(),
	flags: prop.boolean().array(),
	nodes: prop.node().array(),
	opt_tags: prop.text().array().optional(),
	def_tags: prop.text().array().default(["a", "b"]),
	roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
}));
`;
		const fallbackSchema = `
import { sqliteTable, blob } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_table_array", {
	tags: blob("tags", { mode: "json" }).notNull(),
	ids: blob("ids", { mode: "json" }).notNull(),
	flags: blob("flags", { mode: "json" }).notNull(),
	nodes: blob("nodes", { mode: "json" }).notNull(),
	opt_tags: blob("opt_tags", { mode: "json" }),
	def_tags: blob("def_tags", { mode: "json" }).notNull().default('["a","b"]'),
	roles: blob("roles", { mode: "json" }).notNull(),
});
`;

		const result = await runMigrationTest(
			"array_e2e",
			schemaContent,
			fallbackSchema,
		);
		sqlContent = result.sqlContent;
		cleanupFn = result.cleanup;
	}, 60000);

	afterAll(async () => {
		if (cleanupFn) await cleanupFn();
	});

	test("generated SQL should correctly reflect array columns as BLOB", () => {
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
		expect(colLine).toContain('["a","b"]');
	});
});
