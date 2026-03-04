import { describe, expect, test } from "bun:test";
import { Table } from "./table";
import { getTableColumns } from "drizzle-orm";

describe("Table", () => {
	test("should create a Drizzle table with correct columns", () => {
		const UserTable = Table("users", (prop) => ({
			id: prop.integer(),
			name: prop.text().unique().optional(),
			status: prop.enum({ options: ["active", "inactive"] }),
		}));

		expect(UserTable).toBeDefined();
		const columns = getTableColumns(UserTable);
		expect(columns.id).toBeDefined();
		expect(columns.name).toBeDefined();
		expect(columns.status).toBeDefined();

		expect(columns.id.notNull).toBe(true);
		expect(columns.name.notNull).toBe(false);
		expect(columns.name.isUnique).toBe(true);
	});

	test("should handle boolean type", () => {
		const TableWithBool = Table("test", (prop) => ({
			isActive: prop.boolean(),
		}));
		const columns = getTableColumns(TableWithBool);
		// @ts-ignore
		expect(columns.isActive.dataType).toBe("boolean");
	});

    test("should handle timestamp type", () => {
        const TableWithTime = Table("test", (prop) => ({
            createdAt: prop.timestamp(),
        }));
        const columns = getTableColumns(TableWithTime);
        // @ts-ignore
        expect(columns.createdAt.dataType).toBe("date");
    });

    test("should handle node type", () => {
        const TableWithNode = Table("test", (prop) => ({
            data: prop.node(),
        }));
        const columns = getTableColumns(TableWithNode);
        // @ts-ignore
        expect(columns.data.dataType).toBe("json");
    });

    test("should throw error for unsupported type", () => {
        expect(() => {
            Table("test", (_prop: any) => ({
                invalid: { type: "invalid", finalise: (name: string) => ({ type: "invalid", name, isUnique: false, isOptional: false }) }
            }));
        }).toThrow("Unsupported type: invalid");
    });
});
