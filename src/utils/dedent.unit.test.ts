import { describe, expect, test } from "bun:test";
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

		test("handles mixed spaces and tabs (visual alignment)", () => {
			const result = _$`
			  space
				tab
			`;
			expect(result).toBe(" space\ntab");
		});
	});

	describe("trailing whitespace", () => {
		test("trims trailing whitespace from each line", () => {
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

		test("removes trailing blank lines", () => {
			const result = _$`
				content
				
				
			`;
			expect(result).toBe("content");
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

		test("handles empty string interpolation", () => {
			const result = _$`
				start${""}end
			`;
			expect(result).toBe("startend");
		});

		test("handles interpolation with newlines (dedents internal lines of value)", () => {
			// The implementation merges strings and values, then splits by \n.
			// Therefore, lines inside the interpolated value ARE dedented.
			const inner = "line1\nline2";
			const result = _$`
				outer
					${inner}
			`;
			// "outer" has 0 indent (relative to block start).
			// "line1" has indent.
			// "line2" has indent.
			// The min indent is 0 (from "outer").
			// So "line1" and "line2" keep their indentation relative to the template start.
			expect(result).toBe("\t\t\t\touter\n\t\t\t\t\tline1\nline2");
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
			expect(result).toBe("tab-indented\nalso tab-indented");
		});

		test("handles first line with no indent but subsequent lines with indent", () => {
			const result = _$`no indent
				with indent
			`;
			expect(result).toBe("no indent\n\t\t\t\twith indent");
		});
	});
});
