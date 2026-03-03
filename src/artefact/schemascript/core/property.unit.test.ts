import { describe, expect, test } from "bun:test";
import { Property } from "./property";

describe("Property", () => {
	test("should initialize with default options", () => {
		const prop = new Property("text");
		expect(prop.type).toBe("text");
		expect(prop.name).toBeUndefined();
	});

	test("finalise() should return a new property with the given name and freeze it", () => {
		const prop = new Property("text");
		const finalised = prop.finalise("myColumn");
		expect(finalised.name).toBe("myColumn");
		expect(Object.isFrozen(finalised)).toBe(true);
	});

	test("enumOptions() should set enum options", () => {
		const prop = new Property("enum");
		const config = { options: ["A", "B"] };
		const withOptions = prop.enumOptions(config);
		expect(withOptions.enumConfigs).toEqual(config);
	});

	test("toString() for standard types", () => {
		const prop = new Property("text").finalise("username");
		expect(prop.toString()).toBe('text("username")');
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

	test("toTypeScriptType() mapping", () => {
		expect(new Property("integer").toTypeScriptType()).toBe("bigint");
		expect(new Property("real").toTypeScriptType()).toBe("number");
		expect(new Property("text").toTypeScriptType()).toBe("string");
		expect(new Property("boolean").toTypeScriptType()).toBe("boolean");
		expect(new Property("blob").toTypeScriptType()).toBe("Uint8Array");
		expect(new Property("timestamp").toTypeScriptType()).toBe("Date");
		expect(new Property("node").toTypeScriptType()).toBe("object");

		const enumProp = new Property("enum").enumOptions({ options: ["A", "B"] });
		expect(enumProp.toTypeScriptType()).toBe('"A" | "B"');

		const enumObjProp = new Property("enum").enumOptions({
			options: { X: 1, Y: 2 },
		});
		expect(enumObjProp.toTypeScriptType()).toBe('"X" | "Y"');

		const unknownProp = new Property("unknown" as any);
		expect(unknownProp.toTypeScriptType()).toBe("unknown");
	});

	test("toJSON() should return all options", () => {
		const prop = new Property("text").finalise("test");
		const json = prop.toJSON();
		expect(json.type).toBe("text");
		expect(json.name).toBe("test");
	});
});
