import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle as ordb } from "drizzle-orm/bun-sqlite";

const cacheDb = () => {
	const memSql = new Database(":memory:");
	return ordb(memSql);
};

const storeDb = () => {
	const dbPath = join(process.cwd(), "storage", "main.sqlite.db");
	const diskSql = new Database(dbPath, { create: true });
	return ordb(diskSql);
};

export { cacheDb, storeDb };
