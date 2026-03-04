import { describe, expect, test } from "bun:test";
import * as Primitive from "./primitive";
import { Property } from "./property";

describe("Primitive", () => {
	test("should have all required primitive types", () => {
		expect(Primitive.integer).toBeInstanceOf(Property);
		expect(Primitive.integer.type).toBe("integer");

		expect(Primitive.real).toBeInstanceOf(Property);
		expect(Primitive.real.type).toBe("real");

		expect(Primitive.text).toBeInstanceOf(Property);
		expect(Primitive.text.type).toBe("text");

		expect(Primitive.blob).toBeInstanceOf(Property);
		expect(Primitive.blob.type).toBe("blob");

		expect(Primitive.timestamp).toBeInstanceOf(Property);
		expect(Primitive.timestamp.type).toBe("timestamp");

		expect(Primitive.boolean).toBeInstanceOf(Property);
		expect(Primitive.boolean.type).toBe("boolean");

		expect(Primitive.node).toBeInstanceOf(Property);
		expect(Primitive.node.type).toBe("node");

		expect(Primitive.enum).toBeInstanceOf(Property);
		expect(Primitive.enum.type).toBe("enum");
	});
});
