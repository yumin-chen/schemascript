import { sql } from "../proxies/sqlite";

const value = {
	now: () => now,
};

const now = sql`CURRENT_TIMESTAMP`;

export { value as Value, value };
