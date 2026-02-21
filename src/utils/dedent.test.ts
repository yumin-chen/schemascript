import { describe, test, expect } from "bun:test";
import { _$ } from "./dedent";

describe("dedent (_$)", () => {
	describe("leading whitespace removal", () => {
		test("strips leading newline and common indentation", () => {
			const result = _$`
				hello
				world
			`;
			expect(result).toBe("hello\nworld");
		});

		test("strips leading blank lines before first content", () => {
			const result = _$`
				first line
			`;
			expect(result).toBe("first line");
		});

		test("handles single-line template with no leading newline", () => {
			const result = _$`hello`;
			expect(result).toBe("hello");
		});
	});

	describe("indentation stripping", () => {
		test("removes common indentation from all lines", () => {
			const result = _$`
				line one
				line two
				line three
			`;
			expect(result).toBe("line one\nline two\nline three");
		});

		test("preserves relative indentation between lines", () => {
			const result = _$`
				outer
					inner
				outer again
			`;
			expect(result).toBe("outer\n\tinner\nouter again");
		});

		test("handles deeper nesting levels", () => {
			const result = _$`
				level 0
					level 1
						level 2
					level 1 again
			`;
			expect(result).toBe("level 0\n\tlevel 1\n\t\tlevel 2\n\tlevel 1 again");
		});
	});

	describe("trailing whitespace", () => {
		test("trims trailing whitespace from each line", () => {
			// Embed spaces via interpolation to avoid editor stripping
			const line = "hello   ";
			const result = _$`
				${line}
				world
			`;
			expect(result).toBe("hello\nworld");
		});

		test("does not add trailing newline at end", () => {
			const result = _$`
				foo
				bar
			`;
			expect(result.endsWith("\n")).toBe(false);
		});
	});

	describe("blank lines", () => {
		test("preserves blank lines between content", () => {
			const result = _$`
				first

				third
			`;
			expect(result).toBe("first\n\nthird");
		});

		test("preserves multiple consecutive blank lines", () => {
			const result = _$`
				a


				b
			`;
			expect(result).toBe("a\n\n\nb");
		});
	});

	describe("interpolated values", () => {
		test("interpolates string values", () => {
			const name = "world";
			const result = _$`
				hello ${name}
			`;
			expect(result).toBe("hello world");
		});

		test("interpolates number values", () => {
			const n = 42;
			const result = _$`
				count: ${n}
			`;
			expect(result).toBe("count: 42");
		});

		test("interpolates multiple values in one line", () => {
			const a = "foo";
			const b = "bar";
			const result = _$`
				${a} and ${b}
			`;
			expect(result).toBe("foo and bar");
		});

		test("interpolates values across multiple lines", () => {
			const x = "X";
			const y = "Y";
			const result = _$`
				first: ${x}
				second: ${y}
			`;
			expect(result).toBe("first: X\nsecond: Y");
		});

		test("interpolation does not affect indentation calculation", () => {
			const val = "value";
			const result = _$`
				outer ${val}
					inner
			`;
			expect(result).toBe("outer value\n\tinner");
		});
	});

	describe("edge cases", () => {
		test("empty template returns empty string", () => {
			const result = _$``;
			expect(result).toBe("");
		});

		test("only-whitespace template returns empty string", () => {
			const result = _$`   `;
			expect(result).toBe("");
		});

		test("template with only blank lines strips to empty string", () => {
			const result = _$`

			`;
			expect(result).toBe("");
		});

		test("single non-indented line is returned as-is", () => {
			const result = _$`just a line`;
			expect(result).toBe("just a line");
		});

		test("handles tabs and spaces consistently (tabs as-is)", () => {
			const result = _$`
				tab-indented
				also tab-indented
			`;
			// Both lines share the same tab-based indent, result should have none
			expect(result).toBe("tab-indented\nalso tab-indented");
		});
	});
});
