import { describe, expect, test } from "bun:test";
import { Property } from "./property";
import { value } from "./value";

describe("Property", () => {
	test("should initialize correctly", () => {
		const prop = new Property("text");
		expect(prop.type).toBe("text");
		expect(prop.isOptional).toBe(false);
		expect(prop.isUnique).toBe(false);
	});

	test("init should return the same property with casted type", () => {
		const prop = new Property("integer");
		const inited = prop.init<bigint>();
		expect(inited).toBe(prop);
	});

	test("finalise should return a frozen property with name", () => {
		const prop = new Property("text");
		const finalised = prop.finalise("test_name");
		expect(finalised.name).toBe("test_name");
		expect(Object.isFrozen(finalised)).toBe(true);
	});

	test("optional should mark property as optional", () => {
		const prop = new Property("text");
		const optionalProp = prop.optional();
		expect(optionalProp.isOptional).toBe(true);
		expect(prop.isOptional).toBe(false); // Immutability
	});

	test("unique should mark property as unique", () => {
		const prop = new Property("text");
		const uniqueProp = prop.unique();
		expect(uniqueProp.isUnique).toBe(true);
		expect(prop.isUnique).toBe(false); // Immutability
	});

	test("array should mark property as array", () => {
		const prop = new Property("text");
		const arrayProp = prop.array();
		expect(arrayProp.isArray).toBe(true);
		expect(prop.isArray).toBe(false); // Immutability
	});

	test("array should throw if property is identifier", () => {
		const prop = new Property("integer").identifier();
		expect(() => prop.array()).toThrow("Identifiers cannot be arrays.");
	});

	test("identifier should mark property as primary key", () => {
		const prop = new Property("text");
		const idProp = prop.identifier();
		expect(idProp.isIdentifier).toBe(true);
		expect(prop.isIdentifier).toBe(false);
	});

	test("identifier with autoIncrement for integers", () => {
		const prop = new Property("integer");
		const idProp = prop.identifier({ autoIncrement: true });
		expect(idProp.isIdentifier).toBe(true);
		expect(idProp.isAutoIncrement).toBe(true);
	});

	test("identifier should throw for enums", () => {
		const prop = new Property("enum");
		expect(() => (prop as any).identifier()).toThrow(
			"Enums cannot be identifiers.",
		);
	});

	test("identifier should throw for arrays", () => {
		const prop = new Property("text").array();
		expect(() => (prop as any).identifier()).toThrow(
			"Arrays cannot be identifiers.",
		);
	});

	test("references should store reference metadata", () => {
		const mockRef = () => ({}) as any;
		const prop = new Property("integer").references(mockRef, {
			onDelete: "cascade",
		});
		expect(prop.reference?.ref).toBe(mockRef);
		expect(prop.reference?.actions?.onDelete).toBe("cascade");
	});

	test("default should store default value", () => {
		const prop = new Property("integer").default(42n);
		expect(prop.hasDefault).toBe(true);
		expect(prop.defaultValue).toBe(42n);
	});

	test("toString for primitive types", () => {
		const prop = new Property("text").finalise("id");
		expect(prop.toString()).toBe('text("id")');

		const optionalProp = new Property("integer").optional().finalise("age");
		expect(optionalProp.toString()).toBe('integer("age").optional()');

		const uniqueProp = new Property("text").unique().finalise("email");
		expect(uniqueProp.toString()).toBe('text("email").unique()');

		const idProp = new Property("integer")
			.identifier({ autoIncrement: true })
			.finalise("id");
		expect(idProp.toString()).toBe(
			'integer("id").identifier({ autoIncrement: true })',
		);

		const arrayProp = new Property("text").array().finalise("tags");
		expect(arrayProp.toString()).toBe('text("tags").array()');

		const bothProp = new Property("text").optional().unique().finalise("desc");
		expect(bothProp.toString()).toBe('text("desc").optional().unique()');

		const refProp = new Property("integer")
			.references(() => ({}) as any, { onDelete: "cascade" })
			.finalise("user_id");
		expect(refProp.toString()).toBe(
			"integer(\"user_id\").references(..., { onDelete: 'cascade' })",
		);

		const defProp = new Property("timestamp")
			.default(value.now)
			.finalise("created_at");
		expect(defProp.toString()).toContain(".default(");
	});

	test("toString for enums with array options", () => {
		const prop = new Property("enum")
			.enumOptions({ options: ["ADMIN", "USER"] })
			.finalise("role");
		expect(prop.toString()).toContain('enum("role"');
		expect(prop.toString()).toContain('["ADMIN", "USER"]');
	});

	test("toString for enums with object options", () => {
		const prop = new Property("enum")
			.enumOptions({ options: { ACTIVE: 1, INACTIVE: 0 } })
			.finalise("status");
		expect(prop.toString()).toContain('enum("status"');
		expect(prop.toString()).toContain("ACTIVE: 1,");
		expect(prop.toString()).toContain("INACTIVE: 0,");
	});

	test("toTypeScriptType for all types", () => {
		expect(new Property("integer").toTypeScriptType()).toBe("bigint");
		expect(new Property("real").toTypeScriptType()).toBe("number");
		expect(new Property("text").toTypeScriptType()).toBe("string");
		expect(new Property("boolean").toTypeScriptType()).toBe("boolean");
		expect(new Property("blob").toTypeScriptType()).toBe("Uint8Array");
		expect(new Property("timestamp").toTypeScriptType()).toBe("Date");
		expect(new Property("node").toTypeScriptType()).toBe("object");
		expect(new Property("unknown_type" as any).toTypeScriptType()).toBe(
			"unknown",
		);
	});

	test("toTypeScriptType for optional types", () => {
		expect(new Property("text").optional().toTypeScriptType()).toBe(
			"string | null",
		);
	});

	test("toTypeScriptType for array types", () => {
		expect(new Property("text").array().toTypeScriptType()).toBe("string[]");
		expect(new Property("integer").array().toTypeScriptType()).toBe("bigint[]");
	});

	test("toTypeScriptType for enums", () => {
		const prop = new Property("enum").enumOptions({ options: ["A", "B"] });
		expect(prop.toTypeScriptType()).toBe('"A" | "B"');

		const arrayEnum = new Property("enum")
			.enumOptions({ options: ["A", "B"] })
			.array();
		expect(arrayEnum.toTypeScriptType()).toBe('("A" | "B")[]');

		const propNoConfig = new Property("enum");
		expect(propNoConfig.toTypeScriptType()).toBe("string | number");
	});

	test("toJSON should include type and options", () => {
		const prop = new Property("text").optional().unique().finalise("name");
		const json = prop.toJSON();
		expect(json.type).toBe("text");
		expect(json.name).toBe("name");
		expect(json.isOptional).toBe(true);
		expect(json.isUnique).toBe(true);
	});
});
