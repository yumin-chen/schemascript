import { $ } from "bun";

export async function generate(schemaPath: string, dialect: string) {
	console.info(`Generating migrations for ${schemaPath} using dialect ${dialect}...`);

	const result = await $`drizzle-kit generate --dialect ${dialect} --schema ${schemaPath}`;

	if (result.exitCode !== 0) {
		console.error("Migration generation failed.");
		console.error(result.stderr.toString());
		process.exit(1);
	}
	console.info("Migration generation successful.");
}
