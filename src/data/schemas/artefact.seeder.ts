import { seed } from "drizzle-seed";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./artefact";

async function main() {
	const sqlite = new Database("storage/artefact.db");
	const db = drizzle(sqlite);

	await seed(db, { artefacts: schema.artefactTable }).refine((f) => ({
		artefacts: {
			count: 50,
			columns: {
				pathname: f.filePath(),
				digest: f.sha256(),
				mode: f.valuesFromArray({
					values: [100644, 100755, 120000, 40000, 160000],
				}),
				modified_at: f.date({
					minDate: "2023-01-01",
					maxDate: "2025-12-31",
				}),
				created_at: f.date({
					minDate: "2023-01-01",
					maxDate: "2025-12-31",
				}),
			},
		},
	}));

	console.info("Seeding complete: 50 artefacts generated.");
}

main().catch(console.error);
