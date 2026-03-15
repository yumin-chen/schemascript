import { describe, expect, test } from "bun:test";
import { Table, table } from "./table";

describe("Table Registry", () => {
	test("should automatically register tables", () => {
		const UserTable = Table("users_registry_test", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const retrieved = table("users_registry_test");
		expect(retrieved).toBeDefined();
		// Accessing a property should work because of the Proxy
		expect(retrieved.id).toBeDefined();
		expect(retrieved.id).toBe(UserTable.id);
	});

	test("should throw error if table is not in registry", () => {
		const nonExistent = table("non_existent");
		expect(() => nonExistent.id).toThrow(
			'Table "non_existent" not found in registry',
		);
	});

	test("should handle forward references with table() API", () => {
		// PostTable references UserTable before UserTable is defined
		const PostTable = Table("posts_registry_test", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop
				.integer()
				.references(() => table("users_forward_test").id),
		}));

		const UserTable = Table("users_forward_test", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const inlineFks = (
			PostTable as unknown as {
				[key: symbol]: any[];
			}
		)[Symbol.for("drizzle:SQLiteInlineForeignKeys")];

		expect(inlineFks).toBeDefined();
		expect(inlineFks.length).toBe(1);

		const fk = inlineFks[0];
		// The reference is a lazy getter
		const referencedColumn = fk.reference().foreignColumns[0];
		expect(referencedColumn).toBe(UserTable.id);
	});
});
