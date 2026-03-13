import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { $ } from "bun";
import { compile } from "./compile";

export async function generate(
	entrypoint: string,
	dialect: string,
	outdir?: string,
) {
	const tempOutDir = mkdtempSync(join(tmpdir(), "schemascript-"));

	try {
		await compile(entrypoint, tempOutDir);

		const filename = basename(entrypoint, extname(entrypoint)) + ".js";
		const actualSchemaPath = join(tempOutDir, filename);

		console.info(`Generating migrations for ${actualSchemaPath}...`);

		const args = [
			"drizzle-kit",
			"generate",
			"--dialect",
			dialect,
			"--schema",
			actualSchemaPath,
		];
		if (outdir) {
			args.push("--out", outdir);
		}

		const generateProcess = await $`bun x ${args}`.quiet();

		if (generateProcess.exitCode !== 0) {
			console.error("Error generating SQL:");
			console.error(generateProcess.stderr.toString());
			process.exit(1);
		}
		console.info("SQL migrations generated successfully.");
	} finally {
		if (existsSync(tempOutDir)) {
			rmSync(tempOutDir, { recursive: true, force: true });
		}
	}
}
