import { $ } from "bun";
import { writeFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function run() {
	const args = process.argv.slice(2);
	const npmToken = process.env.NPM_TOKEN;
	const npmrcPath = join(process.cwd(), ".npmrc");
	let createdNpmrc = false;

	if (npmToken) {
		console.info("NPM_TOKEN found, creating temporary .npmrc...");
		// Check if .npmrc already exists to avoid overwriting user's file
		if (await exists(npmrcPath)) {
			console.warn(".npmrc already exists, skipping creation. Ensure it has correct tokens.");
		} else {
			await writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${npmToken}\n`);
			createdNpmrc = true;
		}
	}

	try {
		console.info(`Executing: bun publish --access public ${args.join(" ")}`);

		const result = await $`bun publish --access public ${args}`.nothrow();

		if (result.exitCode !== 0) {
			console.error(`Publish failed with exit code ${result.exitCode}`);
			process.exit(result.exitCode);
		}
	} finally {
		if (createdNpmrc) {
			console.info("Removing temporary .npmrc...");
			await unlink(npmrcPath);
		}
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
