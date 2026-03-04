import { describe, expect, test } from "bun:test";
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

		expect(uniqueProp.unique()).toBe(uniqueProp);
	});

	});

	test("finalise() should return a new property with the given name and freeze it", () => {
		const prop = new Property("text");
		const finalised = prop.finalise("myColumn");
		expect(finalised.name).toBe("myColumn");
		expect(Object.isFrozen(finalised)).toBe(true);
	});

	test("toString() for standard types", () => {
		expect(new Property("integer").finalise("id").toString()).toBe(
			'integer("id")',
		);
		expect(new Property("real").finalise("score").toString()).toBe(
			'real("score")',
		);
		expect(new Property("text").finalise("username").toString()).toBe(
			'text("username")',
		);
		expect(new Property("blob").finalise("data").toString()).toBe(
			'blob("data")',
		);
		expect(new Property("datetime").finalise("created_at").toString()).toBe(
			'datetime("created_at")',
		);
		expect(new Property("node").finalise("metadata").toString()).toBe(
			'node("metadata")',
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

		const unknownProp = new Property("unknown" as any);
		expect(unknownProp.toTypeScriptType()).toBe("unknown");
	});

	test("toJSON() should return all options", () => {
		const prop = new Property("text").finalise("test");
		const json = prop.toJSON();
		expect(json.type).toBe("text");
		expect(json.name).toBe("test");
	});

	test("getOptions() should return a copy of options", () => {
		const prop = new Property("integer").finalise("id");
		const options = prop.getOptions();
		expect(options.name).toBe("id");
	});

	test("init() should return the property (type cast)", () => {
		const prop = new Property("integer");
		const initialized = prop.init<bigint>();
		expect(initialized).toBe(prop);
	});
});
