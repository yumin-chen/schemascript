import { describe, expect, test } from "bun:test";
import { _$ } from "@/utils/dedent";
import { artefactSchema, artefactTable } from "./artefact";

describe("Artefact Schema", () => {
	test("should output the correct schema representation", () => {
		const schemaString = artefactSchema.toString();
		const schemaExpected = _$`
			Schema: Artefact
			{
			   text("pathname").unique(),
			   enum("mode",
			    {   options:
						{
							blob: 100644,
							executable: 100755,
							symlink: 120000,
							directory: 40000,
							submodule: 160000,
						}
					}
			   ),
			   text("digest").unique(),
			   timestamp("modified_at").default("now"),
			   timestamp("created_at").default("now")
			}`;
		expect(schemaString).toBe(schemaExpected);
	});
	test("should output the correct table representation", () => {
		expect(artefactTable).toBeDefined();
	});
});
