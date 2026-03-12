import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Table } from "./table";

describe("Array Query E2E", () => {
	test("should insert and query array fields using bun-sqlite", async () => {
		const sqlite = new Database(":memory:");
		const db = drizzle(sqlite);

		const TestTable = Table("query_test", (prop) => ({
			id: prop.integer().identifier(),
			tags: prop.text().array(),
		}));

		// Create table manually since we're in a unit-like test but with a real DB
		sqlite.run(
			"CREATE TABLE query_test (id INTEGER PRIMARY KEY, tags BLOB NOT NULL)",
		);

		const data = { id: 1n, tags: ["tag1", "tag2", "tag3"] };

		// Insert
		await db.insert(TestTable).values(data);

		// Query
		const result = await db.select().from(TestTable);

		expect(result).toHaveLength(1);
		expect(result[0].tags).toEqual(["tag1", "tag2", "tag3"]);
		expect(Array.isArray(result[0].tags)).toBe(true);
	});
});
