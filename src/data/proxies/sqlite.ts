import type { SQL } from "drizzle-orm";
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
	return ordb<TSchema>(
		async (
			sql: string,
			params: unknown[],
			method: "run" | "all" | "values" | "get",
		) => {
			try {
				const payload: QueryPayload = { sql, params, method };
				const resultStr = __host_sqlite_call(JSON.stringify(payload));
				const result: QueryResult = JSON.parse(resultStr);

				if (result.error) {
					throw new Error(result.error);
				}

				return { rows: result.rows ?? [] };
			} catch (e: unknown) {
				console.error(
					"Runtime Driver Error:",
					e instanceof Error ? e.message : String(e),
				);
				throw e;
			}
		},
	);
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

type primitive =
	| ReturnType<typeof integer>
	| ReturnType<typeof text>
	| ReturnType<typeof real>
	| ReturnType<typeof blob>;

export {
	runtime,
	type primitive,
	type QueryPayload,
	type QueryResult,
	integer,
	blob,
	real,
	sqliteTable,
	text,
	sql,
	type SQL,
};
