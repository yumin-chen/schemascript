import type { primitive } from "@/data/proxies/sqlite";
import { blob, integer, real, sqliteTable, text } from "@/data/proxies/sqlite";
import { field } from "./field";
import type { SchemaBuilder } from "./schema";

function Table(name: string, schemaBuilder: SchemaBuilder) {
	const rawFields = schemaBuilder(field);
	const fields = Object.fromEntries(
		Object.entries(rawFields).map(([key, prop]) => [key, prop.finalise(key)]),
	);
	const sqliteColumns: Record<string, primitive> = {};

	for (const [key, prop] of Object.entries(fields)) {
		const columnName = prop.name ?? key;
		let builder: primitive;

		switch (prop.type) {
			case "integer":
				builder = integer(columnName);
				break;
			case "real":
				builder = real(columnName);
				break;
			case "text":
				builder = text(columnName);
				break;
			case "blob":
				builder = blob(columnName, { mode: "buffer" });
				break;
			case "boolean":
				builder = integer(columnName, { mode: "boolean" });
				break;
			default:
				throw new Error(`Unsupported type: ${prop.type}`);
		}

		builder = builder.notNull() as typeof builder;

		sqliteColumns[key] = builder;
	}

	return sqliteTable(name, sqliteColumns);
}

export { Table };
