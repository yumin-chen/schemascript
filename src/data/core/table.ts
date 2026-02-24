import { blob, integer, real, sqliteTable, text } from "../proxies/sqlite";
import { field } from "./field";
import type { SchemaBuilder } from "./schema";

function Table<TName extends string>(
	name: TName,
	schemaBuilder: SchemaBuilder,
) {
	const fields = schemaBuilder(field());
	const sqliteColumns: Record<string, any> = {};

	for (const [key, prop] of Object.entries(fields)) {
		const colName = prop.name ?? key;
		let builder;

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
			case "enum":
				builder = integer(colName, {
					mode: "number",
					...(prop.config?.options ?? {}),
				});
				break;
			default:
				throw new Error(`Unsupported type: ${prop.type}`);
		}

		if (prop.isIdentifier) builder = builder.primaryKey();
		if (!prop.isOptional) builder = builder.notNull();
		if (prop.isUnique) builder = builder.unique();
		if (prop.hasDefault) builder = builder.default(prop.defaultValue);

		sqliteColumns[key] = builder;
	}

	return sqliteTable(name, sqliteColumns);
}

export { Table };
