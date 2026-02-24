import { sql } from "drizzle-orm";
import {
	blob,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { drizzle as ordb } from "drizzle-orm/sqlite-proxy";

function runtime<TSchema extends Record<string, unknown>>() {
	return ordb(async (sql, params, method) => {
		try {
			const payload: QueryPayload = { sql, params, method };
			const resultStr = __host_sqlite_call(JSON.stringify(payload));
			const result: QueryResult = JSON.parse(resultStr);

			if (result.error) {
				throw new Error(result.error);
			}

			return { rows: result.rows ?? [] };
		} catch (e: any) {
			console.error("Runtime Driver Error:", e.message);
			throw e;
		}
	});
}

interface QueryPayload {
	sql: string;
	params: unknown[];
	method: "run" | "all" | "values" | "get";
}

interface QueryResult {
	rows?: unknown[][];
	last_insert_row_id?: number;
	changes?: number;
	error?: string;
}

declare const __host_sqlite_call: (payload: string) => string;

export {
	runtime,
	type QueryPayload,
	type QueryResult,
	integer,
	blob,
	real,
	sqliteTable,
	text,
	sql,
};
