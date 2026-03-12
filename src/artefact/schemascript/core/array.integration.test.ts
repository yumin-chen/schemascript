import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Array Modifier Integration Tests", () => {
	test("Table should correctly map all array primitive types to Drizzle columns", () => {
		const MyTable = Table("array_integration", (prop) => ({
			int_arr: prop.integer().array(),
			real_arr: prop.real().array(),
			text_arr: prop.text().array(),
			bool_arr: prop.boolean().array(),
			blob_arr: prop.blob().array(),
			date_arr: prop.datetime().array(),
			node_arr: prop.node().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		const expectedColumns = [
			"int_arr",
			"real_arr",
			"text_arr",
			"bool_arr",
			"blob_arr",
			"date_arr",
			"node_arr",
		];

		for (const col of expectedColumns) {
			expect(columns[col]).toBeDefined();
			expect(columns[col].dataType).toBe("json");
			expect(columns[col].notNull).toBe(true);
		}
	});

	test("Table should handle optional array fields", () => {
		const MyTable = Table("array_optional", (prop) => ({
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

	test("Table should handle array fields with default values", () => {
		const defaultTags = ["a", "b"];
		const MyTable = Table("array_default", (prop) => ({
			tags: prop.text().array().default(defaultTags),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; default: unknown }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.dataType).toBe("json");
		expect(columns.tags.default).toEqual(defaultTags);
	});

	test("Table should handle enum array fields", () => {
		const MyTable = Table("array_enum", (prop) => ({
			roles: prop.enum({ options: ["ADMIN", "USER"] }).array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.roles.dataType).toBe("json");
	});

	test("Table should handle complex array fields (optional, unique, default)", () => {
		const defaultScores = [10, 20];
		const MyTable = Table("array_complex", (prop) => ({
			scores: prop.integer().array().optional().unique().default(defaultScores),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<
					string,
					{ dataType: string; notNull: boolean; isUnique: boolean; default: unknown }
				>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.scores.dataType).toBe("json");
		expect(columns.scores.notNull).toBe(false);
		expect(columns.scores.isUnique).toBe(true);
		expect(columns.scores.default).toEqual(defaultScores);
	});
});
