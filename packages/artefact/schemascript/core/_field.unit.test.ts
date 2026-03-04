import { describe, expect, test } from "bun:test";
import { field } from "./_field";
import { Property } from "./property";

describe("Field", () => {
	test("should provide builders for all primitive types", () => {
		expect(field.integer()).toBeInstanceOf(Property);
		expect(field.real()).toBeInstanceOf(Property);
		expect(field.text()).toBeInstanceOf(Property);
		expect(field.blob()).toBeInstanceOf(Property);
		expect(field.timestamp()).toBeInstanceOf(Property);
		expect(field.boolean()).toBeInstanceOf(Property);
		expect(field.node()).toBeInstanceOf(Property);
		expect(field.enum({ options: ["A", "B"] })).toBeInstanceOf(Property);
	});
});
