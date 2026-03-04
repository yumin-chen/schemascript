import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Table Integration", () => {
	test("should correctly map all unique primitive types to Drizzle columns", () => {
		const MyTable = Table("unique_integration", (prop) => ({
			int_uniq: prop.integer().unique(),
			real_uniq: prop.real().unique(),
			text_uniq: prop.text().unique(),
			blob_uniq: prop.blob().unique(),
			bool_uniq: prop.boolean().unique(),
			date_uniq: prop.datetime().unique(),
			node_uniq: prop.node().unique(),
			enum_uniq: prop.enum({ options: ["A", "B"] }).unique(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { isUnique: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_uniq.isUnique).toBe(true);
		expect(columns.real_uniq.isUnique).toBe(true);
		expect(columns.text_uniq.isUnique).toBe(true);
		expect(columns.blob_uniq.isUnique).toBe(true);
		expect(columns.bool_uniq.isUnique).toBe(true);
		expect(columns.date_uniq.isUnique).toBe(true);
		expect(columns.node_uniq.isUnique).toBe(true);
		expect(columns.enum_uniq.isUnique).toBe(true);
	});
});

describe("Optional Modifier Integration", () => {
	test("should correctly map all optional primitive types to Drizzle columns", () => {
		const MyTable = Table("optional_integration", (prop) => ({
			int_opt: prop.integer().optional(),
			real_opt: prop.real().optional(),
			text_opt: prop.text().optional(),
			blob_opt: prop.blob().optional(),
			bool_opt: prop.boolean().optional(),
			date_opt: prop.datetime().optional(),
			node_opt: prop.node().optional(),
			enum_opt: prop.enum({ options: ["A", "B"] }).optional(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_opt.notNull).toBe(false);
		expect(columns.real_opt.notNull).toBe(false);
		expect(columns.text_opt.notNull).toBe(false);
		expect(columns.blob_opt.notNull).toBe(false);
		expect(columns.bool_opt.notNull).toBe(false);
		expect(columns.date_opt.notNull).toBe(false);
		expect(columns.node_opt.notNull).toBe(false);
		expect(columns.enum_opt.notNull).toBe(false);
	});
});

describe("References Integration", () => {
	test("should correctly map references to Drizzle columns", () => {
		const UserTable = Table("users", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const PostTable = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop
				.integer()
				.references(() => UserTable.id, { onDelete: "cascade" }),
		}));

		const inlineFks = (
			PostTable as unknown as {
				[key: symbol]: unknown[];
			}
		)[Symbol.for("drizzle:SQLiteInlineForeignKeys")];

		expect(inlineFks).toBeDefined();
		expect(inlineFks.length).toBeGreaterThan(0);

		const fk = inlineFks[0];
		expect(fk.onDelete).toBe("cascade");
	});
});

describe("Default Modifier Integration", () => {
	test("should correctly map default values to Drizzle columns", () => {
		const MyTable = Table("default_integration", (prop) => ({
			int_def: prop.integer().default(42),
			text_def: prop.text().default("default_text"),
			bool_def: prop.boolean().default(true),
			sql_def: prop.datetime().default(sql`CURRENT_TIMESTAMP`),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { default: unknown }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_def.default).toBe(42);
		expect(columns.text_def.default).toBe("default_text");
		expect(columns.bool_def.default).toBe(true);
		expect(columns.sql_def.default).toBeDefined();
	});
});
