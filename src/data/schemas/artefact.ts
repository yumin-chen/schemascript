import type { SchemaBuilder } from "@artefact/schemascript";
import { Schema, Table } from "@artefact/schemascript";

const artefact: SchemaBuilder = (prop) => ({
	/**
	 * The full path including filename of the artefact.
	 */
	pathname: prop.text(),

	/**
	 * The mode type of the artefact.
	 */
	mode: prop.integer(),

	/**
	 * The cryptographic hash digest of the artefact content.
	 */
	digest: prop.text(),

	/**
	 * The last modification timestamp of the artefact.
	 */
	modified_at: prop.datetime(),

	/**
	 * The creation timestamp of the artefact.
	 */
	created_at: prop.datetime(),
});

const artefactSchema = Schema("Artefact", artefact);
const artefactTable = Table("artefacts", artefact);

export { artefact, artefactSchema, artefactTable };
