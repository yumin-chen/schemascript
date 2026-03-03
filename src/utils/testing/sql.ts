import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

export interface MigrationTestResult {
	sqlContent: string;
	cleanup: () => Promise<void>;
}

export async function runMigrationTest(
	testName: string,
	schemaContent: string,
	fallbackSchemaContent?: string,
): Promise<MigrationTestResult> {
	const tempDir = join(process.cwd(), `temp_test_${testName}_${Date.now()}`);
	await mkdir(tempDir, { recursive: true });

	const schemaPath = join(tempDir, "schema.ts");
	const migrationsDir = join(tempDir, "migrations");

	await writeFile(schemaPath, schemaContent);

	const generateSql =
		await $`BUILD_TARGET=SQLite bun x drizzle-kit generate --dialect sqlite --schema ${schemaPath} --out ${migrationsDir}`.nothrow();

	if (generateSql.exitCode !== 0 && fallbackSchemaContent) {
		await writeFile(schemaPath, fallbackSchemaContent);
		await $`bun x drizzle-kit generate --dialect sqlite --schema ${schemaPath} --out ${migrationsDir}`.nothrow();
	}

	let sqlContent = "";
	const migrationFiles = await $`ls ${migrationsDir}/*.sql`
		.text()
		.catch(() => "");
	if (migrationFiles.trim()) {
		const sqlFile = migrationFiles.trim().split("\n")[0];
		sqlContent = await $`cat ${sqlFile}`.text();
	}

	const cleanup = async () => {
		await rm(tempDir, { recursive: true, force: true });
	};

	return { sqlContent, cleanup };
}
