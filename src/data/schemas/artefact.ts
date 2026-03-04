import type { SchemaBuilder } from "@artefact/schemascript";
import { field, Schema, Table, value } from "@artefact/schemascript";

const artefact: SchemaBuilder = () => ({
	/**
	 * The full path including filename of the artefact.
	 *
	 */
	pathname: field.text().unique(),

	/**
	 * The mode type of the artefact.
	 *
	 */
	mode: field.enum({
		options: {
			blob: 100644,
			executable: 100755,
			symlink: 120000,
			directory: 40000,
			submodule: 160000,
		},
	}),

	/**
	 * The cryptographic hash digest of the artefact content.
	 *
	 */
	digest: field.text().unique(),

	/**
	 * The last modification timestamp of the artefact.
	 *
	 */
	modified_at: field.timestamp().default(value.now),

	/**
	 * The creation timestamp of the artefact.
	 *
	 */
	created_at: field.timestamp().default(value.now),
});

const artefactSchema = Schema("Artefact", artefact);
const artefactTable = Table("artefacts", artefact);

export { artefact, artefactSchema, artefactTable };
