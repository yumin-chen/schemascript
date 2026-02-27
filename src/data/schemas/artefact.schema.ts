import type { SchemaBuilder } from "../core";
import { field, Schema, Table, value } from "../core";

const artefact: SchemaBuilder = () => ({
	name: field.text("name"),
	timestamp: field.integer("timestamp").default(value.now()),
});

const artefactSchema = Schema("Artefact", artefact);
const artefactTable = Table("artefacts", artefact);

export { artefactSchema, artefactTable };
