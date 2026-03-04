import { describe, expect, test } from "bun:test";
import { Schema } from "./schema";
import { Table } from "./table";

describe("Optional Modifier Integration", () => {
	const OptionalSchema = (f: any) => ({
		required: f.text(),
		optional: f.text().optional(),
	});

	test("Schema.toString() includes .optional()", () => {
		const S = Schema("Optional", OptionalSchema);
		expect(S.toString()).toContain('text("required")');
		expect(S.toString()).toContain('text("optional").optional()');
	});

	test("toTypeScriptInterface() handles nullability", () => {
		const S = Schema("Optional", OptionalSchema);
		const ts = S.toTypeScriptInterface();
		expect(ts).toContain("required: string;");
		expect(ts).toContain("optional: string | null;");
	});

	test("Table() correctly sets notNull flag in Drizzle", () => {
		const T = Table("optional_table", OptionalSchema);
		const columns = (T as any)[Symbol.for("drizzle:Columns")];
		expect(columns.required.notNull).toBe(true);
		expect(columns.optional.notNull).toBe(false);
	});
});
