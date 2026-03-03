import { describe, expect, test } from "bun:test";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

describe("Test Policy Enforcement", () => {
	const srcDir = join(process.cwd(), "src");

	const excludedFiles = ["index.ts", "main.ts"];

	const excludedDirs = ["data/proxies", "scripts"];

	async function getFiles(dir: string): Promise<string[]> {
		const entries = await readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			entries.map((entry) => {
				const res = join(dir, entry.name);
				return entry.isDirectory() ? getFiles(res) : [res];
			}),
		);
		return files.flat();
	}

	test("every source file should have a co-located test file", async () => {
		const allFiles = await getFiles(srcDir);
		const sourceFiles = allFiles.filter((file) => {
			const ext = extname(file);
			const base = basename(file);
			const relativePath = file.replace(`${srcDir}/`, "");

			return (
				(ext === ".ts" || ext === ".tsx") &&
				!file.endsWith(".test.ts") &&
				!excludedFiles.includes(base) &&
				!excludedDirs.some((dir) => relativePath.startsWith(dir))
			);
		});

		for (const file of sourceFiles) {
			const dir = file.substring(0, file.lastIndexOf("/"));
			const base = basename(file, extname(file));

			const possibleTests = [
				join(dir, `${base}.unit.test.ts`),
				join(dir, `${base}.integration.test.ts`),
				join(dir, `${base}.e2e.test.ts`),
			];

			let testExists = false;
			for (const testFile of possibleTests) {
				try {
					const s = await stat(testFile);
					if (s.isFile()) {
						testExists = true;
						break;
					}
				} catch (_e) {}
			}

			expect(testExists).toBe(
				true,
				`Source file ${file} is missing a co-located test file (.unit.test.ts, .integration.test.ts, or .e2e.test.ts)`,
			);
		}
	});
});
