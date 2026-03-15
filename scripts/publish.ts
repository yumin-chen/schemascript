import { $ } from "bun";
import { join } from "node:path";
import { homedir } from "node:os";

const args = Bun.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const tagIndex = args.indexOf("--tag");
const tag = tagIndex !== -1 ? args[tagIndex + 1] : "latest";

const command = ["bun", "publish", "--access", "public", "--tag", tag];
if (isDryRun) {
	command.push("--dry-run");
}

console.info(`Publishing package (dry-run: ${isDryRun}, tag: ${tag})...`);

if (process.env.NPM_TOKEN && !isDryRun) {
	const npmrcContent = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`;
	const npmrcPath = join(homedir(), ".npmrc");
	await Bun.write(npmrcPath, npmrcContent);
	console.info(`Created .npmrc at ${npmrcPath}`);
}

const proc = await $`${command}`.nothrow();

if (proc.exitCode !== 0) {
	console.error(`Publish failed with exit code ${proc.exitCode}`);
	process.exit(proc.exitCode);
}

console.info("Publish complete.");
