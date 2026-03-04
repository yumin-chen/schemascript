import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Table", () => {
	test("should map all primitive types to Drizzle columns", () => {
		const MyTable = Table("my_table", (prop) => ({
			int: prop.integer(),
			real: prop.real(),
			txt: prop.text(),
			buf: prop.blob(),
			bool: prop.boolean(),
			time: prop.datetime(),
			obj: prop.node(),
		}));

		expect(MyTable).toBeDefined();
		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(Object.keys(columns)).toEqual([
			"int",
			"real",
			"txt",
			"buf",
			"bool",
			"time",
			"obj",
		]);
	});

	test("should handle optional fields by omitting notNull", () => {
		const MyTable = Table("my_table", (prop) => ({
			req: prop.text(),
			opt: prop.text().optional(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(columns.req.notNull).toBe(true);
		expect(columns.opt.notNull).toBe(false);
	});

	test("should handle unique fields", () => {
		const MyTable = Table("my_table", (prop) => ({
			email: prop.text().unique(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { isUnique: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(columns.email.isUnique).toBe(true);
	});

	test("should correctly map all unique primitive types", () => {
		const MyTable = Table("unique_test", (prop) => ({
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

	test("should handle enums with mapping", () => {
		const MyTable = Table("my_table", (prop) => ({
			status: prop.enum({ options: ["A", "B"] }),
		}));

		const columns = (
			MyTable as unknown as { [key: symbol]: Record<string, unknown> }
		)[Symbol.for("drizzle:Columns")];
		expect(columns.status).toBeDefined();
	});

	test("should handle enums with object options", () => {
		const MyTable = Table("my_table", (prop) => ({
			status: prop.enum({ options: { ACTIVE: 1, INACTIVE: 0 } }),
		}));

		const columns = (
			MyTable as unknown as { [key: symbol]: Record<string, unknown> }
		)[Symbol.for("drizzle:Columns")];
		expect(columns.status).toBeDefined();
	});

	test("should fallback to integer for enums without options", () => {
		const MyTable = Table("my_table", (prop) => ({
			status: prop.enum({} as any),
		}));
		const columns = (
			MyTable as unknown as { [key: symbol]: Record<string, unknown> }
		)[Symbol.for("drizzle:Columns")];
		expect(columns.status).toBeDefined();
	});

	test("should throw error for unsupported type", () => {
		expect(() => {
			Table("error", () => ({
				bad: {
					type: "invalid",
					finalise: (key: string) => ({ type: "invalid", name: key }),
					getOptions: () => ({}),
				} as any,
			}));
		}).toThrow("Unsupported type: invalid");
	});
});
