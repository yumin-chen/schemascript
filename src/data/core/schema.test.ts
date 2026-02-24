import { describe, expect, test } from "bun:test";
import { _$ } from "@/utils/dedent";
import { Schema } from "./schema";

describe("Schema toString", () => {
	test("should output schema name and fields", () => {
		const schema = Schema("users", (prop) => ({
			id: prop.integer("id").identifier(),
			name: prop.text("name"),
			email: prop.text("email").unique(),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: users
			{
			   integer("id").identifier(),
			   text("name"),
			   text("email").unique()
			}`;
		expect(result).toBe(expected);
	});
	test("should include .optional() for optional fields", () => {
		const schema = Schema("posts", (prop) => ({
			id: prop.integer("id").identifier(),
			title: prop.text("title"),
			content: prop.text("content").optional(),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: posts
			{
			   integer("id").identifier(),
			   text("title"),
			   text("content").optional()
			}`;
		expect(result).toBe(expected);
	});
	test("should include default value for fields with default", () => {
		const schema = Schema("settings", (prop) => ({
			id: prop.integer("id").identifier(),
			theme: prop.text("theme").default("light"),
			isActive: prop.integer("isActive").default(1n),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: settings
			{
			   integer("id").identifier(),
			   text("theme").default("light"),
			   integer("isActive").default(1)
			}`;
		expect(result).toBe(expected);
	});
	test("should handle combinations of modifiers", () => {
		const schema = Schema("complex", (prop) => ({
			id: prop.integer("id").identifier(),
			code: prop.text("code").unique().optional(),
			count: prop.integer("count").default(0n),
			description: prop.text("description").optional(),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: complex
			{
			   integer("id").identifier(),
			   text("code").optional().unique(),
			   integer("count").default(0),
			   text("description").optional()
			}`;
		expect(result).toBe(expected);
	});
	test("should format output with proper indentation and newlines", () => {
		const schema = Schema("formatted", (prop) => ({
			id: prop.integer("id").identifier(),
			name: prop.text("name"),
		}));
		const result = schema.toString();
		const lines = result.split("\n");
		expect(lines[0]).toBe("Schema: formatted");
		expect(lines[1]).toBe("{");
		expect(lines.at(-1)).toBe("}");
	});
	test("should handle all data types", () => {
		const schema = Schema("all_types", (prop) => ({
			id: prop.integer("id").identifier(),
			amount: prop.real("amount"),
			data: prop.blob("data"),
			description: prop.text("description"),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: all_types
			{
			   integer("id").identifier(),
			   real("amount"),
			   blob("data"),
			   text("description")
			}`;
		expect(result).toBe(expected);
	});
	test("should handle empty schema", () => {
		const schema = Schema("empty", () => ({}));
		const result = schema.toString();
		expect(result).toBe("Schema: empty\n{\n\n}");
	});
	test("should handle fields with custom names", () => {
		const schema = Schema("custom_names", (prop) => ({
			user_id: prop.integer("id"),
			user_name: prop.text("name").setMetadata("full_name"),
		}));
		const result = schema.toString();
		const expected = _$`
			Schema: custom_names
			{
			   integer("id"),
			   text("full_name")
			}`;
		expect(result).toBe(expected);
	});
});
test("should handle enum field type", () => {
	const schema = Schema("statuses", (prop) => ({
		id: prop.integer("id").identifier(),
		status: prop.enum("status", { options: ["pending", "active", "inactive"] }),
	}));
	const result = schema.toString();
	const expected = _$`
			Schema: statuses
			{
			   integer("id").identifier(),
			   enum("status",
			    {   options:
					[
						"pending", 
						"active", 
						"inactive",
					]
				}
			   )
			}`;
	expect(result).toBe(expected);
});
