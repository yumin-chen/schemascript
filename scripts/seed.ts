import { storeDb } from "../src/data";
import { seedArtefacts } from "../src/data/schemas/artefact.seeder";

async function main() {
	const db = storeDb();
	console.info("Seeding database...");
	await seedArtefacts(db, 50);
	console.info("Seeding complete.");
}

main().catch((err) => {
	console.error("Seeding failed:", err);
	process.exit(1);
});
