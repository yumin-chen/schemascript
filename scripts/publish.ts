import { $ } from "bun";
import { mkdir, writeFile, readdir, readFile, copyFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const args = Bun.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// Improved argument parsing for --tag
let tag = "latest";
const tagIndex = args.indexOf("--tag");
if (tagIndex !== -1 && tagIndex + 1 < args.length) {
    tag = args[tagIndex + 1];
} else {
    const tagArg = args.find(arg => arg.startsWith("--tag="));
    if (tagArg) {
        tag = tagArg.split("=")[1];
    }
}

async function publish() {
    console.info("Starting publish process...");

    const originalCwd = process.cwd();
    const npmrcPath = join(originalCwd, ".npmrc");
    let npmrcCreated = false;

    try {
        // Setup .npmrc if NPM_TOKEN is present
        if (process.env.NPM_TOKEN) {
            console.info("NPM_TOKEN found, setting up .npmrc...");
            const npmrcContent = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`;
            await writeFile(npmrcPath, npmrcContent);
            npmrcCreated = true;
        }

        // Run bun publish
        console.info(`Running: bun publish ${args.join(" ")}`);
        const publishResult = await $`bun publish ${args}`.nothrow();

        if (publishResult.exitCode !== 0) {
            console.error("Publish failed.");
            process.exit(publishResult.exitCode);
        }

        if (isDryRun) {
            console.info("Dry run completed successfully.");
            return;
        }

        // Verification for alpha tag
        if (tag === "alpha") {
            await verifyAlpha(originalCwd);
        }

        console.info("Publish process completed successfully.");
    } finally {
        // Clean up .npmrc if we created it
        if (npmrcCreated) {
            try {
                await rm(npmrcPath);
                console.info("Cleaned up .npmrc");
            } catch (err) {
                console.warn("Failed to clean up .npmrc:", err);
            }
        }
    }
}

async function verifyAlpha(repoRoot: string) {
    console.info(`Verifying alpha release (tag: ${tag})...`);
    const testDir = join(tmpdir(), `schemascript-alpha-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    try {
        console.info(`Creating temporary project in ${testDir}`);

        // Initialize new project
        await $`cd ${testDir} && bun init -y`;

        console.info("Installing @artefacto/schemascript@alpha and dependencies...");
        // We use the published package
        await $`cd ${testDir} && bun add @artefacto/schemascript@alpha drizzle-orm`;
        await $`cd ${testDir} && bun add -d drizzle-kit @types/bun`;

        // Copy utilities needed for tests
        await mkdir(join(testDir, "utils/testing"), { recursive: true });
        await copyFile(
            join(repoRoot, "src/utils/testing/sql.ts"),
            join(testDir, "utils/testing/sql.ts")
        );

        // Copy E2E tests and modify them
        const e2eFiles = [
            "src/artefact/schemascript/core/table.e2e.test.ts",
            "src/artefact/schemascript/core/property.e2e.test.ts",
            "src/artefact/schemascript/core/schema.e2e.test.ts"
        ];

        for (const file of e2eFiles) {
            let content = await readFile(join(repoRoot, file), "utf-8");

            // Replace internal imports with package imports
            content = content
                .replace(/@\/utils\/testing\/sql/g, "./utils/testing/sql")
                .replace(/@\/data\/proxies\/sqlite/g, "@artefacto/schemascript");

            // The tests often do:
            // const libraryPath = join(process.cwd(), "src/artefact/schemascript/index.ts");
            // We need to change this to "@artefacto/schemascript"
            content = content.replace(
                /const libraryPath = join\([\s\S]*?"src\/artefact\/schemascript\/index\.ts"\);/g,
                'const libraryPath = "@artefacto/schemascript";'
            );

            const destFile = join(testDir, file.split("/").pop()!);
            await writeFile(destFile, content);
        }

        console.info("Running E2E tests in the temporary project...");
        // We need to set BUILD_TARGET=SQLite for the tests as seen in sql.ts
        const testResult = await $`cd ${testDir} && BUILD_TARGET=SQLite bun test`.nothrow();

        if (testResult.exitCode !== 0) {
            console.error(testResult.stdout.toString());
            console.error(testResult.stderr.toString());
            throw new Error("E2E tests failed in the temporary project.");
        }

        console.info("Alpha verification successful!");
    } catch (error) {
        console.error("Alpha verification failed:", error);
        process.exit(1);
    } finally {
        // Clean up temporary project
        try {
            await rm(testDir, { recursive: true, force: true });
            console.info("Cleaned up temporary test directory.");
        } catch (err) {
            console.warn("Failed to clean up temporary test directory:", err);
        }
    }
}

publish().catch(err => {
    console.error("Unexpected error during publish:", err);
    process.exit(1);
});
