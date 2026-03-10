import { describe, expect, test } from "bun:test";
import { Schema } from "./schema";

describe("Schema", () => {
	test("should define a schema with fields", () => {
		const User = Schema("User", (prop) => ({
			id: prop.integer(),
			name: prop.text(),
		}));

		expect(User._name).toBe("User");
		expect(User.fields.id.name).toBe("id");
		expect(User.fields.name.name).toBe("name");
	});

	test("toString() should return correct representation", () => {
		const User = Schema("User", (prop) => ({
			id: prop.integer(),
		}));
		const str = User.toString();
		expect(str).toContain("Schema: User");
		expect(str).toContain('integer("id")');
	});

	test("toTypeScriptInterface() should return correct interface string", () => {
		const User = Schema("User", (prop) => ({
			id: prop.integer(),
			name: prop.text(),
			score: prop.real(),
			data: prop.blob(),
			created_at: prop.datetime(),
			metadata: prop.node(),
		}));
		const ts = User.toTypeScriptInterface();
		expect(ts).toContain("interface User {");
		expect(ts).toContain("id: bigint;");
		expect(ts).toContain("name: string;");
		expect(ts).toContain("score: number;");
		expect(ts).toContain("data: Uint8Array;");
		expect(ts).toContain("created_at: Date;");
		expect(ts).toContain("metadata: object;");
	});

	test("toJSON() should return serializable object", () => {
		const User = Schema("User", (prop) => ({
			id: prop.integer(),
		}));
		const json = User.toJSON();
		expect(json.name).toBe("User");
		expect(json.fields.id.type).toBe("integer");
	});
});
