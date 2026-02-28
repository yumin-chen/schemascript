import type { SchemaBuilder } from "../core";
import { field, Schema, Table, value } from "../core";

const artefact: SchemaBuilder = () => ({

	/**
	 * The full path including filename of the artefact. 
	 *
	 * @name pathname
	 * @description The full path including filename of the artefact. 
	 * @type TEXT
	 * @unique
	 */
	pathname: field.text("pathname").unique(),


	/**
	 * The cryptographic hash digest of the artefact content. 
	 *
	 * @name digest
	 * @description The cryptographic hash digest of the artefact content.
	 * @type TEXT
	 */
	digest: field.text("digest").unique(),

	/**
	 * The last modification timestamp of the artefact. 
	 *
	 * @name modified_at
	 * @description The last modification timestamp of the artefact.
	 * @type INTEGER.Timestamp
	 * @derived
	 */
	modifiedAt: field.integer("modified_at", { mode: "timestamp" }).default(value.now),

	/**
	 * The creation timestamp of the artefact. 
	 *
	 * @name created_at
	 * @description The creation timestamp of the artefact.
	 * @type INTEGER.Timestamp
	 * @derived
	 */
	createdAt: field.integer("created_at", { mode: "timestamp" }).default(value.now),
});

const artefactSchema = Schema("Artefact", artefact);
const artefactTable = Table("artefacts", artefact);

export { artefactSchema, artefactTable };
