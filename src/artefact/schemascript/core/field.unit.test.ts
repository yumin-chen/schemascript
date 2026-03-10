import { describe, expect, test } from "bun:test";
import { field } from "./field";

describe("field factory", () => {
	test("integer() should return an integer property", () => {
		const prop = field.integer();
		expect(prop.type).toBe("integer");
	});

	test("real() should return a real property", () => {
		const prop = field.real();
		expect(prop.type).toBe("real");
	});

	test("text() should return a text property", () => {
		const prop = field.text();
		expect(prop.type).toBe("text");
	});

	test("blob() should return a blob property", () => {
		const prop = field.blob();
		expect(prop.type).toBe("blob");
	});

	test("boolean() should return a boolean property", () => {
		const prop = field.boolean();
		expect(prop.type).toBe("boolean");
	});

	test("datetime() should return a datetime property", () => {
		const prop = field.datetime();
		expect(prop.type).toBe("datetime");
	});

	test("node() should return a node property", () => {
		const prop = field.node();
		expect(prop.type).toBe("node");
	});

	test("enum() should return an enum property", () => {
		const prop = field.enum({ options: ["A", "B"] });
		expect(prop.type).toBe("enum");
	});
});
