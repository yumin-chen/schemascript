import { $ } from "bun";

const schemasEntrypoint = process.argv[2] ?? "src/data/schemas";
const version = await $`git describe --tags --always`.text();
const target = "SQLite";
const buildTime = new Date().toISOString();
const gitCommit = await $`git rev-parse HEAD`.text();

await Bun.build({
	entrypoints: [`./${schemasEntrypoint}/index.ts`],
	outdir: "./out/schemas",
	define: {
		BUILD_VERSION: JSON.stringify(version.trim()),
		BUILD_TARGET: JSON.stringify(target),
		BUILD_TIME: JSON.stringify(buildTime),
		GIT_COMMIT: JSON.stringify(gitCommit.trim()),
	},
	target: "bun",
	format: "esm",
});

const schemaFilePath = "./out/schemas/index.js";
const generateSql =
	await $`BUILD_TARGET=SQLite drizzle-kit generate --dialect sqlite --schema ${schemaFilePath}`;

if (generateSql.exitCode !== 0) {
	console.error("Error generating SQL:", generateSql.stderr);
	process.exit(1);
}

await Bun.build({
	entrypoints: ["./src/main.ts"],
	outdir: "./dist",
	define: {
		BUILD_VERSION: JSON.stringify(version.trim()),
		BUILD_TARGET: JSON.stringify(target),
		BUILD_TIME: JSON.stringify(buildTime),
		GIT_COMMIT: JSON.stringify(gitCommit.trim()),
	},
	target: "bun",
	format: "esm",
});

console.info(
	`Built with version ${version.trim()}, commit ${gitCommit.trim()}, build time ${buildTime}.`,
);
