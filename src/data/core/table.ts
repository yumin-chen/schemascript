import type { primitive } from "../proxies/sqlite";
import { blob, integer, real, sqliteTable, text } from "../proxies/sqlite";
import { field } from "./field";
import type { SchemaBuilder } from "./schema";

function Table<TName extends string>(
	name: TName,
	schemaBuilder: SchemaBuilder,
) {
	const fields = schemaBuilder(field);
	const sqliteColumns: Record<string, primitive> = {};

	for (const [key, prop] of Object.entries(fields)) {
		const colName = prop.name ?? key;
		let builder: primitive;

		switch (prop.type) {
			case "integer":
				builder = integer(colName);
				break;
			case "text":
				builder = text(colName);
				break;
			case "real":
				builder = real(colName);
				break;
			case "blob":
				builder = blob(colName, { mode: "buffer" });
				break;
			case "enum": {
				const config = prop.config as { options?: string[] } | undefined;
				builder = integer(colName, {
					mode: "number",
					...(config?.options as unknown as Record<string, unknown>),
				});
				break;
			}
			default:
				throw new Error(`Unsupported type: ${prop.type}`);
		}

		if (prop.isIdentifier) {
			builder = builder.primaryKey() as typeof builder;
		}
		if (!prop.isOptional) {
			builder = builder.notNull() as typeof builder;
		}
		if (prop.isUnique) {
			builder = builder.unique() as typeof builder;
		}
		if (prop.hasDefault) {
			builder = builder.default(prop.defaultValue as never) as typeof builder;
		}

		sqliteColumns[key] = builder;
	}

	return sqliteTable(name, sqliteColumns);
}

export { Table };
