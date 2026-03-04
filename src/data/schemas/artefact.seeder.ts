import { seed } from "drizzle-seed";
import { artefactTable } from "./artefact";
import type { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

/**
 * Seeds the artefacts table with random but deterministic data.
 *
 * @param db The Drizzle database instance.
 * @param count The number of artefacts to seed.
 */
export async function seedArtefacts(db: any, count = 10) {
	await seed(db, { artefactTable }).refine((f) => ({
		artefactTable: {
			count,
			columns: {
				pathname: f.string(),
				digest: f.string(),
				mode: f.valuesFromArray({
					values: ["blob", "executable", "symlink", "directory", "submodule"],
				}),
				modified_at: f.timestamp(),
				created_at: f.timestamp(),
			},
		},
	}));
}
