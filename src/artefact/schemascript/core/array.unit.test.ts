import { describe, expect, test } from "bun:test";
import { Property } from "./property";
import { value } from "./value";

describe("Array Modifier Unit Tests", () => {
	test("should mark property as array for all primitive types", () => {
		const types = ["integer", "real", "text", "boolean", "blob", "timestamp", "node"] as const;
		for (const type of types) {
			const prop = new Property(type).array();
			expect(prop.isArray).toBe(true);
		}
	});

	test("array modifier should be immutable", () => {
		const prop = new Property("text");
		const arrayProp = prop.array();
		expect(prop.isArray).toBe(false);
		expect(arrayProp.isArray).toBe(true);
	});

	test("array().array() should be idempotent", () => {
		const prop = new Property("text").array();
		const arrayArrayProp = prop.array();
		expect(arrayArrayProp.isArray).toBe(true);
		expect(arrayArrayProp).toBe(prop);
	});

	test("interaction with optional()", () => {
		const prop = new Property("text").array().optional();
		expect(prop.isArray).toBe(true);
		expect(prop.isOptional).toBe(true);
		expect(prop.toTypeScriptType()).toBe("string[] | null");

		const prop2 = new Property("text").optional().array();
		expect(prop2.isArray).toBe(true);
		expect(prop2.isOptional).toBe(true);
		expect(prop2.toTypeScriptType()).toBe("string[] | null");
	});

	test("interaction with unique()", () => {
		const prop = new Property("text").array().unique();
		expect(prop.isArray).toBe(true);
		expect(prop.isUnique).toBe(true);
	});

	test("interaction with default()", () => {
		const defaultValue = ["a", "b"];
		const prop = new Property("text").array().default(defaultValue);
		expect(prop.isArray).toBe(true);
		expect(prop.hasDefault).toBe(true);
		expect(prop.defaultValue).toEqual(defaultValue);
	});

	test("should throw if identifier() is called on an array", () => {
		const prop = new Property("text").array();
		expect(() => (prop as any).identifier()).toThrow("Arrays cannot be identifiers.");
	});

	test("should throw if array() is called on an identifier", () => {
		const prop = new Property("integer").identifier();
		expect(() => prop.array()).toThrow("Identifiers cannot be arrays.");
	});

	describe("toString()", () => {
		test("basic array toString", () => {
			const prop = new Property("text").array().finalise("tags");
			expect(prop.toString()).toBe('text("tags").array()');
		});

		test("optional array toString", () => {
			const prop = new Property("text").array().optional().finalise("tags");
			expect(prop.toString()).toBe('text("tags").optional().array()');
		});

		test("array with default toString", () => {
			const prop = new Property("text").array().default(["a", "b"]).finalise("tags");
			expect(prop.toString()).toBe('text("tags").array().default(["a","b"])');
		});

		test("enum array toString", () => {
			const prop = new Property("enum")
				.enumOptions({ options: ["A", "B"] })
				.array()
				.finalise("roles");
			const str = prop.toString();
			expect(str).toContain('enum("roles"');
			expect(str).toContain('["A", "B"]');
			expect(str).toContain(".array()");
		});

		test("bigint array default toString potential issue", () => {
			// This is expected to throw based on current implementation in property.ts
			const prop = new Property("integer").array().default([1n, 2n]).finalise("ids");
			expect(() => prop.toString()).toThrow("JSON.stringify cannot serialize BigInt");
		});
	});

	describe("toTypeScriptType()", () => {
		test("primitive array types", () => {
			expect(new Property("integer").array().toTypeScriptType()).toBe("bigint[]");
			expect(new Property("real").array().toTypeScriptType()).toBe("number[]");
			expect(new Property("text").array().toTypeScriptType()).toBe("string[]");
			expect(new Property("boolean").array().toTypeScriptType()).toBe("boolean[]");
			expect(new Property("blob").array().toTypeScriptType()).toBe("Uint8Array[]");
			expect(new Property("timestamp").array().toTypeScriptType()).toBe("Date[]");
			expect(new Property("node").array().toTypeScriptType()).toBe("object[]");
		});

		test("enum array types", () => {
			const prop = new Property("enum").enumOptions({ options: ["A", "B"] }).array();
			expect(prop.toTypeScriptType()).toBe('("A" | "B")[]');

			const propNumeric = new Property("enum").enumOptions({ options: { ACTIVE: 1, INACTIVE: 0 } }).array();
			expect(propNumeric.toTypeScriptType()).toBe('("ACTIVE" | "INACTIVE")[]');
		});

		test("optional array types", () => {
			expect(new Property("text").array().optional().toTypeScriptType()).toBe("string[] | null");
		});
	});
});
