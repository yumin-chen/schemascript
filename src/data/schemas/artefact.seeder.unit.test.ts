import { describe, expect, test } from "bun:test";
import { storeDb } from "../../data";
import { artefactTable } from "./artefact";
import { seedArtefacts } from "./artefact.seeder";

describe("Artefact Seeder", () => {
	test("should seed data into the artefacts table", async () => {
		const db = storeDb();

		// Clear existing data
		await db.delete(artefactTable);

		const count = 25;
		await seedArtefacts(db, count);

		const artefacts = await db.select().from(artefactTable).all();
		expect(artefacts.length).toBe(count);

		for (const a of artefacts) {
			expect(a.pathname).toBeDefined();
			expect(a.digest).toBeDefined();
			expect(a.mode).toBeDefined();
		}
	});
});
