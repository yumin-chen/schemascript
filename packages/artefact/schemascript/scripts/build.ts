import { $ } from "bun";
import { execSync } from "node:child_process";

const version = await $`git describe --tags --always`.nothrow().text();
const target = "SQLite";
const buildTime = new Date().toISOString();
const gitCommit = await $`git rev-parse HEAD`.nothrow().text();

console.info("Building @artefact/schemascript...");

await Bun.build({
	entrypoints: ["./index.ts"],
	outdir: "./",
	define: {
		BUILD_VERSION: JSON.stringify(version.trim() || "0.0.0"),
		BUILD_TARGET: JSON.stringify(target),
		BUILD_TIME: JSON.stringify(buildTime),
		GIT_COMMIT: JSON.stringify(gitCommit.trim() || "unknown"),
	},
	target: "node",
	format: "esm",
	external: ["drizzle-orm"],
});

console.info("Generating type definitions for @artefact/schemascript...");
try {
	execSync("bun x tsc --project tsconfig.json || true");
	// Flatten the output: tsc with rootDir: "../../" (packages/) puts files in dist/artefact/schemascript/
	execSync(
		"if [ -d dist/artefact/schemascript ]; then cp -r dist/artefact/schemascript/* .; fi && rm -rf dist artefact data utils core/*.test.d.ts",
	);
} catch (e) {
	console.error("Error generating type definitions:", e);
}

console.info(`Built @artefact/schemascript with version ${version.trim() || "0.0.0"}.`);
