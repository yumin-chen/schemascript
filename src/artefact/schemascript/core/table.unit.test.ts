import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Table", () => {
	test("should create a Drizzle table with correct columns", () => {
		const _UserTable = Table("users", (prop) => ({
			id: prop.integer(),
			name: prop.text().unique().optional(),
			status: prop.enum({ options: ["active", "inactive"] }),
		}));

		expect(_UserTable).toBeDefined();
		const columns = (
			_UserTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(Object.keys(columns)).toEqual(["id", "name", "status"]);
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

	test("should handle array fields as JSON blobs", () => {
		const MyTable = Table("my_table", (prop) => ({
			tags: prop.text().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; mode: string }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(columns.tags.dataType).toBe("json");
	});

	test("should handle enums with mapping", () => {
		const MyTable = Table("my_table", (prop) => ({
			id: prop.integer(),
			name: prop.text().optional().unique(),
			status: prop.enum({ options: ["A", "B"] }),
		}));

		const columns = (
			MyTable as unknown as { [key: symbol]: Record<string, unknown> }
		)[Symbol.for("drizzle:Columns")];
		expect(columns.status).toBeDefined();

		expect(columns.id.notNull).toBe(true);
		expect(columns.name.notNull).toBe(false);
		expect(columns.name.isUnique).toBe(true);
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
			status: prop.enum({} as never),
		}));
		const columns = (
			MyTable as unknown as { [key: symbol]: Record<string, unknown> }
		)[Symbol.for("drizzle:Columns")];
		expect(columns.status).toBeDefined();
	});

	test("should throw error for unsupported type", () => {
		expect(() => {
			Table("error", (prop) => ({
				// @ts-expect-error - testing invalid type
				bad: new (prop.text().constructor)("invalid"),
			}));
		}).toThrow();
	});

	test("should handle array fields for different types", () => {
		const MyTable = Table("my_table", (prop) => ({
			tags: prop.text().array(),
			ids: prop.integer().array(),
			flags: prop.boolean().array(),
			nodes: prop.node().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(columns.tags.dataType).toBe("json");
		expect(columns.ids.dataType).toBe("json");
		expect(columns.flags.dataType).toBe("json");
		expect(columns.nodes.dataType).toBe("json");
	});

	test("should handle enum mapping from driver", () => {
		const MyTable = Table("enum_map_test", (prop) => ({
			status: prop.enum({ options: ["active", "inactive"] }),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<
					string,
					{ mapFromDriverValue: (v: unknown) => unknown }
				>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.status.mapFromDriverValue(0)).toBe("active");
		expect(columns.status.mapFromDriverValue(1)).toBe("inactive");
	});
});
