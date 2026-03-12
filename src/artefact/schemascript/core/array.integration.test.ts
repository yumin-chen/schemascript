import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Array Modifier Integration Tests", () => {
	test("should correctly map all array primitive types to Drizzle columns with mode: json", () => {
		const MyTable = Table("array_integration", (prop) => ({
			int_arr: prop.integer().array(),
			real_arr: prop.real().array(),
			text_arr: prop.text().array(),
			bool_arr: prop.boolean().array(),
			blob_arr: prop.blob().array(),
			date_arr: prop.datetime().array(),
			node_arr: prop.node().array(),
			enum_arr: prop.enum({ options: ["A", "B"] }).array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { dataType: string; mode: string }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.int_arr.dataType).toBe("json");
		expect(columns.real_arr.dataType).toBe("json");
		expect(columns.text_arr.dataType).toBe("json");
		expect(columns.bool_arr.dataType).toBe("json");
		expect(columns.blob_arr.dataType).toBe("json");
		expect(columns.date_arr.dataType).toBe("json");
		expect(columns.node_arr.dataType).toBe("json");
		expect(columns.enum_arr.dataType).toBe("json");
	});

	test("optional().array() should result in a nullable column", () => {
		const MyTable = Table("array_optional_integration", (prop) => ({
			tags: prop.text().optional().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.notNull).toBe(false);
	});

	test("array().optional() should result in a nullable column", () => {
		const MyTable = Table("array_optional_integration_rev", (prop) => ({
			tags: prop.text().array().optional(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.notNull).toBe(false);
	});

	test("array should be NOT NULL by default", () => {
		const MyTable = Table("array_not_null_integration", (prop) => ({
			tags: prop.text().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { notNull: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.notNull).toBe(true);
	});

	test("default([...]).array() should correctly map the default value", () => {
		const defaultTags = ["news", "tech"];
		const MyTable = Table("array_default_integration", (prop) => ({
			tags: prop.text().array().default(defaultTags),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { default: unknown }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.default).toEqual(defaultTags);
	});

    test("interaction with unique() in integration", () => {
		const MyTable = Table("array_unique_integration", (prop) => ({
			tags: prop.text().array().unique(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { isUnique: boolean }>;
			}
		)[Symbol.for("drizzle:Columns")];

		expect(columns.tags.isUnique).toBe(true);
	});
});
