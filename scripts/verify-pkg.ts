import { mkdir, rm, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const fullPkgName = process.argv[2] || "@artefacto/schemascript@alpha";
const tempDir = join(process.cwd(), `temp_verify_${Date.now()}`);

// Correctly extract package name without version/tag, even for scoped packages
// Example: @artefacto/schemascript@alpha -> @artefacto/schemascript
const pkgName = fullPkgName.startsWith("@")
	? `@${fullPkgName.slice(1).split("@")[0]}`
	: fullPkgName.split("@")[0];

console.log(`Verifying package: ${fullPkgName}`);
console.log(`Working directory: ${tempDir}`);
console.log(`Library name for override: ${pkgName}`);

try {
	await mkdir(tempDir, { recursive: true });

	// Initialize new project
	await $`cd ${tempDir} && bun init -y`;

	// Install package and peer dependencies
	await $`cd ${tempDir} && bun add ${fullPkgName} drizzle-orm drizzle-kit`;

	// Copy src and tsconfig.json to have tests and utils available
	await cp(join(process.cwd(), "src"), join(tempDir, "src"), {
		recursive: true,
	});
	await cp(join(process.cwd(), "tsconfig.json"), join(tempDir, "tsconfig.json"));

	// Run the E2E tests using the installed package
	console.log("Running E2E tests against installed package...");
	const result =
		await $`cd ${tempDir} && SCHEMASCRIPT_LIB_PATH=${pkgName} bun test src/artefact/schemascript/core/*.e2e.test.ts`.nothrow();

	if (result.exitCode !== 0) {
		console.error("E2E tests failed!");
		process.exit(1);
	}

	console.log("Verification successful!");
} catch (error) {
	console.error("Verification failed with error:", error);
	process.exit(1);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
