import { describe, expect, test } from "bun:test";
import { Property } from "./property";

describe("Array Modifier Unit Tests", () => {
	const primitiveTypes = [
		"integer",
		"real",
		"text",
		"boolean",
		"blob",
		"datetime",
		"node",
	] as const;

	for (const type of primitiveTypes) {
		test(`array() should mark ${type} property as array`, () => {
			const prop = new Property(type);
			const arrayProp = prop.array();
			expect(arrayProp.isArray).toBe(true);
			expect(prop.isArray).toBe(false); // Immutability
		});
	}

	test("array() should mark enum property as array", () => {
		const prop = new Property("enum").enumOptions({ options: ["A", "B"] });
		const arrayProp = prop.array();
		expect(arrayProp.isArray).toBe(true);
	});

	test("array() should be idempotent", () => {
		const prop = new Property("text").array();
		const secondArrayProp = prop.array();
		expect(secondArrayProp).toBe(prop);
		expect(secondArrayProp.isArray).toBe(true);
	});

	test("array() should throw if property is already an identifier", () => {
		const prop = new Property("integer").identifier();
		expect(() => prop.array()).toThrow("Identifiers cannot be arrays.");
	});

	describe("Interactions with other modifiers", () => {
		test("array() and optional()", () => {
			const prop = new Property("text").array().optional();
			expect(prop.isArray).toBe(true);
			expect(prop.isOptional).toBe(true);
			expect(prop.toTypeScriptType()).toBe("string[] | null");
		});

		test("optional() and array()", () => {
			const prop = new Property("text").optional().array();
			expect(prop.isArray).toBe(true);
			expect(prop.isOptional).toBe(true);
			expect(prop.toTypeScriptType()).toBe("string[] | null");
		});

		test("array() and unique()", () => {
			const prop = new Property("text").array().unique();
			expect(prop.isArray).toBe(true);
			expect(prop.isUnique).toBe(true);
		});

		test("array() and default()", () => {
			const defaultValue = ["tag1", "tag2"];
			const prop = new Property("text").array().default(defaultValue);
			expect(prop.isArray).toBe(true);
			expect(prop.hasDefault).toBe(true);
			expect(prop.defaultValue).toEqual(defaultValue);
		});

		test("array() and references()", () => {
			const mockRef = () => ({}) as any;
			const prop = new Property("integer").array().references(mockRef);
			expect(prop.isArray).toBe(true);
			expect(prop.reference?.ref).toBe(mockRef);
		});
	});

	describe("toTypeScriptType()", () => {
		test("integer array", () => {
			expect(new Property("integer").array().toTypeScriptType()).toBe("bigint[]");
		});
		test("real array", () => {
			expect(new Property("real").array().toTypeScriptType()).toBe("number[]");
		});
		test("text array", () => {
			expect(new Property("text").array().toTypeScriptType()).toBe("string[]");
		});
		test("boolean array", () => {
			expect(new Property("boolean").array().toTypeScriptType()).toBe("boolean[]");
		});
		test("blob array", () => {
			expect(new Property("blob").array().toTypeScriptType()).toBe("Uint8Array[]");
		});
		test("datetime array", () => {
			expect(new Property("datetime").array().toTypeScriptType()).toBe("Date[]");
		});
		test("node array", () => {
			expect(new Property("node").array().toTypeScriptType()).toBe("object[]");
		});
		test("enum array (array options)", () => {
			const prop = new Property("enum").enumOptions({ options: ["A", "B"] }).array();
			expect(prop.toTypeScriptType()).toBe('("A" | "B")[]');
		});
		test("enum array (object options)", () => {
			const prop = new Property("enum").enumOptions({ options: { X: 1, Y: 2 } }).array();
			expect(prop.toTypeScriptType()).toBe('("X" | "Y")[]');
		});
	});

	describe("toString()", () => {
		test("simple text array", () => {
			const prop = new Property("text").array().finalise("tags");
			expect(prop.toString()).toBe('text("tags").array()');
		});

		test("optional integer array", () => {
			const prop = new Property("integer").array().optional().finalise("scores");
			expect(prop.toString()).toBe('integer("scores").optional().array()');
		});

		test("text array with default", () => {
			const prop = new Property("text").array().default(["a", "b"]).finalise("tags");
			expect(prop.toString()).toBe('text("tags").array().default(["a","b"])');
		});

		test("enum array with options and default", () => {
			const prop = new Property("enum")
				.enumOptions({ options: ["ADMIN", "USER"] })
				.array()
				.default(["USER"])
				.finalise("roles");
			const str = prop.toString();
			expect(str).toContain('enum("roles"');
			expect(str).toContain('["ADMIN", "USER"]');
			expect(str).toContain(".array()");
			expect(str).toContain('.default(["USER"])');
		});
	});
});
