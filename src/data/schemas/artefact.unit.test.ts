import { describe, expect, test } from "bun:test";
import { _$ } from "@/utils/dedent";
import { artefactSchema, artefactTable } from "./artefact";

describe("Artefact Schema", () => {
	test("should output the correct schema representation", () => {
		const schemaString = artefactSchema.toString();
		const schemaExpected = _$`
			Schema: Artefact
			{
			   text("pathname"),
			   integer("mode"),
			   text("digest"),
			   integer("modified_at"),
			   integer("created_at")
			}`;
		expect(schemaString).toBe(schemaExpected);
	});
	test("should output the correct table representation", () => {
		expect(artefactTable).toBeDefined();
	});
});
