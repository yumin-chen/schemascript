import { describe, expect, test } from "bun:test";
import type { AnySQLiteColumn } from "@/data/proxies/sqlite";
import { sql } from "@/data/proxies/sqlite";
import { Property } from "./property";

describe("Property", () => {
	test("should initialize with default options", () => {
		const prop = new Property("text");
		expect(prop.type).toBe("text");
		expect(prop.name).toBeUndefined();
		expect(prop.isUnique).toBe(false);
		expect(prop.isOptional).toBe(false);
	});

	test("unique() should return a new property with isUnique true", () => {
		const prop = new Property("integer");
		const uniqueProp = prop.unique();
		expect(uniqueProp.isUnique).toBe(true);
		expect(prop.isUnique).toBe(false);
	});

	test("optional() should return a new property with isOptional true", () => {
		const prop = new Property("text");
		const optionalProp = prop.optional();
		expect(optionalProp.isOptional).toBe(true);
		expect(prop.isOptional).toBe(false);

		// idempotent
		expect(optionalProp.optional()).toBe(optionalProp);
	});

	test("finalise() should return a new property with the given name and freeze it", () => {
		const prop = new Property("text");
		const finalised = prop.finalise("myColumn");
		expect(finalised.name).toBe("myColumn");
		expect(Object.isFrozen(finalised)).toBe(true);
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

		const identifierProp = new Property("text").identifier().finalise("id");
		expect(identifierProp.toString()).toBe('text("id").identifier()');

		const aiProp = new Property("integer")
			.identifier({ autoIncrement: true })
			.finalise("id");
		expect(aiProp.toString()).toBe(
			'integer("id").identifier({ autoIncrement: true })',
		);

		const arrayProp = new Property("text").array().finalise("tags");
		expect(arrayProp.toString()).toBe('text("tags").array()');

		const bothProp = new Property("text").optional().unique().finalise("desc");
		expect(bothProp.toString()).toBe('text("desc").optional().unique()');

		const refProp = new Property("integer")
			.references(() => ({}) as unknown as AnySQLiteColumn, {
				onDelete: "cascade",
			})
			.finalise("user_id");
		expect(refProp.toString()).toBe(
			'integer("user_id").references(() => ..., { onDelete: "cascade" })',
		);

		const defaultStrProp = new Property("text")
			.default("hello")
			.finalise("greeting");
		expect(defaultStrProp.toString()).toBe('text("greeting").default("hello")');

		const defaultNumProp = new Property("integer")
			.default(42)
			.finalise("answer");
		expect(defaultNumProp.toString()).toBe('integer("answer").default(42)');

		const defaultSqlProp = new Property("datetime")
			.default(sql`CURRENT_TIMESTAMP`)
			.finalise("created_at");
		expect(defaultSqlProp.toString()).toBe(
			'datetime("created_at").default(sql`...`)',
		);
	});

	test("toString() for enum types with array options", () => {
		const prop = new Property("enum")
			.enumOptions({ options: ["admin", "user"] })
			.finalise("role");
		expect(prop.toString()).toContain('enum("role"');
		expect(prop.toString()).toContain('["admin", "user"]');
	});

	test("toString() for enum types with object options", () => {
		const prop = new Property("enum")
			.enumOptions({ options: { ACTIVE: 1, INACTIVE: 0 } })
			.finalise("status");
		expect(prop.toString()).toContain('enum("status"');
		expect(prop.toString()).toContain("ACTIVE: 1");
	});

	test("modifiers should update options", () => {
		const prop = new Property("text");
		expect(prop.optional().getOptions().isOptional).toBe(true);
		expect(prop.unique().getOptions().isUnique).toBe(true);
		expect(prop.identifier().getOptions().isIdentifier).toBe(true);
	});

	test("identifier() with options", () => {
		const prop = new Property("integer").identifier({ autoIncrement: true });
		expect(prop.isIdentifier).toBe(true);
		expect(prop.identifierConfigs?.autoIncrement).toBe(true);
	});

	test("references() should update options", () => {
		const dummyRef = () => ({}) as unknown as AnySQLiteColumn;
		const prop = new Property("integer").references(dummyRef, {
			onDelete: "cascade",
		});
		const options = prop.getOptions();
		expect(options.references).toBeDefined();
		expect(options.references?.ref).toBe(dummyRef);
		expect(options.references?.onDelete).toBe("cascade");
	});

	test("default() should update options", () => {
		const prop = new Property("text").default("value");
		expect(prop.getOptions().default).toBe("value");
	});

	test("toTypeScriptType() mapping", () => {
		expect(new Property("integer").toTypeScriptType()).toBe("bigint");
		expect(new Property("real").toTypeScriptType()).toBe("number");
		expect(new Property("text").toTypeScriptType()).toBe("string");
		expect(new Property("blob").toTypeScriptType()).toBe("Uint8Array");
		expect(new Property("boolean").toTypeScriptType()).toBe("boolean");
		expect(new Property("datetime").toTypeScriptType()).toBe("Date");
		expect(new Property("node").toTypeScriptType()).toBe("object");

		const enumProp = new Property("enum").enumOptions({ options: ["A", "B"] });
		expect(enumProp.toTypeScriptType()).toBe('"A" | "B"');

		const enumObjProp = new Property("enum").enumOptions({
			options: { X: 1, Y: 2 },
		});
		expect(enumObjProp.toTypeScriptType()).toBe('"X" | "Y"');

		expect(new Property("text").optional().toTypeScriptType()).toBe(
			"string | null",
		);

		const unknownProp = new Property("unknown" as never);
		expect(unknownProp.toTypeScriptType()).toBe("unknown");
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

	test("toJSON() should return all options", () => {
		const prop = new Property("text").unique().optional().finalise("test");
		const json = prop.toJSON();
		expect(json.type).toBe("text");
		expect(json.name).toBe("test");
		expect(json.isUnique).toBe(true);
		expect(json.isOptional).toBe(true);
	});
});
