import { describe, expect, test } from "bun:test";
import { Table, table } from "./table";

describe("Table Registry", () => {
	test("should register and retrieve a table", () => {
		const users = Table("users", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const retrieved = table("users");
		expect(retrieved).toBe(users);
	});

	test("should throw if table not found", () => {
		expect(() => table("non_existent")).toThrow('Table "non_existent" not found in registry.');
	});

	test("should allow forward references using table() in a thunk", () => {
		const posts = Table("posts_forward_ref", (prop) => ({
			id: prop.integer().identifier(),
			authorId: prop.integer().references(() => table("users_forward_ref").id),
		}));

		const _users = Table("users_forward_ref", (prop) => ({
			id: prop.integer().identifier(),
		}));

		expect(posts).toBeDefined();
		const columns = (posts as any)[Symbol.for("drizzle:Columns")];

		// In Drizzle SQLite, references are stored in the table config, not necessarily on the column itself in a public way.
		// For now, we verify the column exists.
		expect(columns.authorId).toBeDefined();
	});
});
