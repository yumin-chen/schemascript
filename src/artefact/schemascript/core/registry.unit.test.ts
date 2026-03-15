import { describe, expect, test } from "bun:test";
import { Table, table } from "./table";

describe("Table Registry", () => {
	test("Table should automatically register tables", () => {
		const UserTable = Table("users", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const retrieved = table("users");
		expect(retrieved).toBeDefined();
		// Accessing a property should work via proxy
		expect(retrieved.id).toBeDefined();
		expect(retrieved.id).toBe(UserTable.id);
	});

	test("table() should throw error if table not found in registry", () => {
		const nonExistent = table("non_existent");
		expect(() => nonExistent.id).toThrow('Table "non_existent" not found in registry.');
	});

	test("table() should work in .references() with forward references", () => {
		// PostTable references UserTable which is defined later
		const PostTable = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			authorId: prop.integer().references(() => table("users_ref").id),
		}));

		const UserTable = Table("users_ref", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		expect(PostTable.authorId.reference).toBeDefined();
		const ref = PostTable.authorId.reference.ref();
		expect(ref).toBe(UserTable.id);
	});

    test("table() should return the same table from registry", () => {
        const MyTable = Table("my_table_2", (prop) => ({
            id: prop.integer().identifier(),
        }));

        const t1 = table("my_table_2");
        const t2 = table("my_table_2");

        // They are proxies, but they should resolve to the same underlying object properties
        expect(t1.id).toBe(MyTable.id);
        expect(t2.id).toBe(MyTable.id);
        expect(t1.id).toBe(t2.id);
    });
});
