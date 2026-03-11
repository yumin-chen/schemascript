import { sql } from "@/data/proxies/sqlite";

export const value = {
	get now() {
		return sql`CURRENT_TIMESTAMP`;
	},
};
