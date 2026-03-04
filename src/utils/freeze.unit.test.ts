import { describe, expect, test } from "bun:test";
import { deepFreeze } from "./freeze";

describe("deepFreeze", () => {
	test("should freeze objects", () => {
		const obj = { a: 1, b: { c: 2 } };
		const frozen = deepFreeze(obj);
		expect(Object.isFrozen(frozen)).toBe(true);
		expect(Object.isFrozen(frozen.b)).toBe(true);

		expect(() => {
			// @ts-expect-error
			frozen.a = 3;
		}).toThrow();
	});

	test("should handle null and primitives", () => {
		expect(deepFreeze(null)).toBe(null);
		expect(deepFreeze(42)).toBe(42);
	});

	test("should freeze arrays", () => {
		const arr = [1, { a: 1 }];
		const frozen = deepFreeze(arr);
		expect(Object.isFrozen(frozen)).toBe(true);
		expect(Object.isFrozen(frozen[1])).toBe(true);
	});
});
