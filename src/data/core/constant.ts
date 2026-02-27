import { buildTarget } from "@/utils/macro.ts" with { type: "macro" };
import { sql } from "../proxies/sqlite";

const BUILD_TARGET = buildTarget();

const now = sql`CURRENT_TIMESTAMP`;

const sqlValue = {
	now: () => now,
};

const Constant = () =>
	(BUILD_TARGET === "SQLite" && {
		now: sqlValue.now,
	}) || {
		now: () => "now()",
	};

export { Constant };
