import { describe, expect, test } from "bun:test";
import { join } from "node:path";

describe("Published Package Smoke Test", () => {
    const libPath = process.env.SCHEMASCRIPT_LIB_PATH || "@artefacto/schemascript";

    test("should be able to import and use Table", async () => {
        const { Table } = await import(libPath);
        expect(Table).toBeDefined();

        const User = Table("users", (prop: any) => ({
            id: prop.integer().identifier(),
            name: prop.text(),
        }));

        expect(User).toBeDefined();
        expect((User as any)[Symbol.for("drizzle:Name")]).toBe("users");
    });

    test("should be able to import and use Schema", async () => {
        const { Schema } = await import(libPath);
        expect(Schema).toBeDefined();

        const UserSchema = Schema("User", (prop: any) => ({
            id: prop.integer().identifier(),
            name: prop.text(),
        }));

        expect(UserSchema).toBeDefined();
    });
});
