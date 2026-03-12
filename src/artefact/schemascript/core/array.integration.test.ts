import { describe, expect, test } from "bun:test";
import { Table } from "./table";

describe("Array Modifier Integration", () => {
	test("should correctly map array fields to Drizzle columns (blob/json)", () => {
		const MyTable = Table("array_integration", (prop) => ({
			tags: prop.text().array(),
			scores: prop.integer().array(),
		}));

		const columns = (
			MyTable as unknown as {
				[key: symbol]: Record<string, { columnType: string }>;
			}
		)[Symbol.for("drizzle:Columns")];

		// In SQLite-proxy/core, blob with mode 'json' is used for arrays
		expect(columns.tags.columnType).toBe("SQLiteBlobJson");
		expect(columns.scores.columnType).toBe("SQLiteBlobJson");
	});
});
