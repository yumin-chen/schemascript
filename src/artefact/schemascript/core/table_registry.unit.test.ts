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

	test("should allow circular references (A -> B -> A) using table()", () => {
		const TableA = Table("table_a_circular", (prop) => ({
			id: prop.integer().identifier(),
			tableBId: prop.integer().references(() => table("table_b_circular").id),
		}));

		const TableB = Table("table_b_circular", (prop) => ({
			id: prop.integer().identifier(),
			tableAId: prop.integer().references(() => table("table_a_circular").id),
		}));

		expect(TableA).toBeDefined();
		expect(TableB).toBeDefined();

		const columnsA = (TableA as any)[Symbol.for("drizzle:Columns")];
		const columnsB = (TableB as any)[Symbol.for("drizzle:Columns")];

		expect(columnsA.tableBId).toBeDefined();
		expect(columnsB.tableAId).toBeDefined();
	});

	test("should handle re-registration (overwrite) by name", () => {
		const usersV1 = Table("users_re_reg", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const retrievedV1 = table("users_re_reg");
		expect(retrievedV1).toBe(usersV1);

		const usersV2 = Table("users_re_reg", (prop) => ({
			id: prop.integer().identifier(),
			newField: prop.text(),
		}));

		const retrievedV2 = table("users_re_reg");
		expect(retrievedV2).toBe(usersV2);
		expect(retrievedV2).not.toBe(usersV1);
	});

	test("should register and retrieve multiple tables", () => {
		const t1 = Table("t1", (prop) => ({ id: prop.integer().identifier() }));
		const t2 = Table("t2", (prop) => ({ id: prop.integer().identifier() }));
		const t3 = Table("t3", (prop) => ({ id: prop.integer().identifier() }));

		expect(table("t1")).toBe(t1);
		expect(table("t2")).toBe(t2);
		expect(table("t3")).toBe(t3);
	});
});
