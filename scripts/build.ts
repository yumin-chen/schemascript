import { $ } from "bun";

const version = await $`git describe --tags --always`.text();
const target = "SQLite";
const buildTime = new Date().toISOString();
const gitCommit = await $`git rev-parse HEAD`.text();

const entrypoints = ["./src/main.ts", "./src/artefact/schemascript/index.ts"];

await Bun.build({
	entrypoints,
	outdir: "./dist",
	define: {
		BUILD_VERSION: JSON.stringify(version.trim()),
		BUILD_TARGET: JSON.stringify(target),
		BUILD_TIME: JSON.stringify(buildTime),
		GIT_COMMIT: JSON.stringify(gitCommit.trim()),
	},
	target: "bun",
	format: "esm",
	sourcemap: "external",
});

console.info(
	`Built with version ${version.trim()}, commit ${gitCommit.trim()}, build time ${buildTime}.`,
);
