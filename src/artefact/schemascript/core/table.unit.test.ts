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

	test("should handle identifier fields", () => {
		const MyTable = Table("my_table", (prop) => ({
			id: prop.integer().identifier({ autoIncrement: true }),
		}));

		expect(MyTable).toBeDefined();
	});

	test("should handle reference fields", () => {
		const OtherTable = Table("other", (prop) => ({ id: prop.integer() }));
		const MyTable = Table("my_table", (prop) => ({
			other_id: prop.integer().references(() => (OtherTable as any).id),
		}));

		expect(MyTable).toBeDefined();
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
