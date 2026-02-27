import { sql } from "../proxies/sqlite";

const Value = () => process.env["BUILD_TARGET"] === "SQLite" && ({
	now: sqlValue.now,
}) || ({
	now: () => "now()",
});

const value = Value();

const sqlValue = {
	now: () => now,
};

const now = sql`CURRENT_TIMESTAMP`;

export { value, Value };
