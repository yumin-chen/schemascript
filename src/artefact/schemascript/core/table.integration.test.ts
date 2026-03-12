import { describe, expect, test } from "bun:test";
import { sql } from "@/data/proxies/sqlite";
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

	test("should support multiple foreign keys pointing to different tables", () => {
		const TableA = Table("table_a", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const TableB = Table("table_b", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const TableC = Table("table_c", (prop) => ({
			id: prop.integer().identifier(),
			a_id: prop.integer().references(() => TableA.id),
			b_id: prop.integer().references(() => TableB.id),
		}));

		const inlineFks = (
			TableC as unknown as {
				[key: symbol]: unknown[];
			}
		)[Symbol.for("drizzle:SQLiteInlineForeignKeys")];

		expect(inlineFks).toHaveLength(2);
	});

	test("should correctly map all ReferenceAction types", () => {
		const TargetTable = Table("target", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const actions = [
			"cascade",
			"restrict",
			"no action",
			"set null",
			"set default",
		] as const;

		for (const action of actions) {
			const TestTable = Table(`test_${action.replace(" ", "_")}`, (prop) => ({
				ref_id: prop.integer().references(() => TargetTable.id, {
					onDelete: action,
					onUpdate: action,
				}),
			}));

			const inlineFks = (
				TestTable as unknown as {
					[key: symbol]: { onDelete: string; onUpdate: string }[];
				}
			)[Symbol.for("drizzle:SQLiteInlineForeignKeys")];

			expect(inlineFks[0].onDelete).toBe(action);
			expect(inlineFks[0].onUpdate).toBe(action);
		}
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

describe("Array Modifier Integration", () => {
	test("should correctly map all array primitive types to Drizzle columns", () => {
		const MyTable = Table("array_integration", (prop) => ({
			int_arr: prop.integer().array(),
			real_arr: prop.real().array(),
			text_arr: prop.text().array(),
			bool_arr: prop.boolean().array(),
			node_arr: prop.node().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_arr.dataType).toBe("json");
		expect(columns.real_arr.dataType).toBe("json");
		expect(columns.text_arr.dataType).toBe("json");
		expect(columns.bool_arr.dataType).toBe("json");
		expect(columns.node_arr.dataType).toBe("json");
	});

	test("should correctly map optional array types", () => {
		const MyTable = Table("array_optional_integration", (prop) => ({
			tags: prop.text().array().optional(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.dataType).toBe("json");
		expect(columns.tags.notNull).toBe(false);
	});

	test("should correctly map array types with default values", () => {
		const MyTable = Table("array_default_integration", (prop) => ({
			tags: prop.text().array().default(["a", "b"]),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; default: unknown }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.dataType).toBe("json");
		expect(columns.tags.default).toEqual(["a", "b"]);
	});

	test("should correctly map enum array types", () => {
		const MyTable = Table("array_enum_integration", (prop) => ({
			roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.roles.dataType).toBe("json");
	});
});
