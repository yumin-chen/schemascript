import { describe, expect, test } from "bun:test";
import { Table, table } from "./table";

describe("Table Registry Integration", () => {
	test("table() should return an object that behaves like a Drizzle table with metadata", () => {
		const UserTable = Table("users_int", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text().unique(),
		}));

		const retrieved = table("users_int");

		// Should have columns
		expect(retrieved.id).toBeDefined();
		expect(retrieved.name).toBeDefined();

		// Should have Schemascript metadata
		expect(retrieved.id.isIdentifier).toBe(true);
		expect(retrieved.name.isUnique).toBe(true);
		expect(retrieved.name.type).toBe("text");

		// Should be compatible with Drizzle's internal metadata (e.g., Symbol access)
		const columns = (
			retrieved as unknown as {
				[key: symbol]: Record<string, unknown>;
			}
		)[Symbol.for("drizzle:Columns")];
		expect(columns).toBeDefined();
		expect(Object.keys(columns)).toContain("id");
		expect(Object.keys(columns)).toContain("name");
	});

	test("table() should work with references across multiple tables", () => {
		const Groups = Table("groups", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const Users = Table("users_groups", (prop) => ({
			id: prop.integer().identifier(),
			groupId: prop.integer().references(() => table("groups").id),
		}));

		const Posts = Table("posts_groups", (prop) => ({
			id: prop.integer().identifier(),
			authorId: prop.integer().references(() => table("users_groups").id),
		}));

		expect(Users.groupId.reference?.ref()).toBe(Groups.id);
		expect(Posts.authorId.reference?.ref()).toBe(Users.id);
	});
});
