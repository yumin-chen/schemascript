import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Table", () => {
	test("should map all primitive types to Drizzle columns", () => {
		const MyTable = Table("my_table", (prop) => ({
			int: prop.integer(),
			real: prop.real(),
			txt: prop.text(),
			buf: prop.blob(),
		}));

		expect(MyTable).toBeDefined();
		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(Object.keys(columns)).toEqual(["int", "real", "txt", "buf"]);
	});

	test("should throw error for unsupported type", () => {
		expect(() => {
			Table("error", () => ({
				bad: {
					type: "invalid",
					finalise: (key: string) => ({ type: "invalid", name: key }),
				} as any,
			}));
		}).toThrow("Unsupported type: invalid");
	});
});
