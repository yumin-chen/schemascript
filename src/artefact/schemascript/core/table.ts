import type { primitive as DrizzlePrimitive } from "@/data/proxies/sqlite";
import { blob, integer, real, sqliteTable, text } from "@/data/proxies/sqlite";
import { field } from "./field";
import type { SchemaBuilder } from "./schema";

function Table(name: string, schemaBuilder: SchemaBuilder) {
	const rawFields = schemaBuilder(field);
	const fields = Object.fromEntries(
		Object.entries(rawFields).map(([key, prop]) => [key, prop.finalise(key)]),
	);
	const sqliteColumns: Record<string, DrizzlePrimitive> = {};

	for (const [key, prop] of Object.entries(fields)) {
		const columnName = prop.name ?? key;
		let builder: DrizzlePrimitive;

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
			case "datetime":
				builder = integer(columnName, { mode: "timestamp" });
				break;
			default:
				throw new Error(`Unsupported type: ${prop.type}`);
		}

		const options = prop.getOptions();

		if (options.isIdentifier) {
			builder = builder.primaryKey({
				autoIncrement: options.autoIncrement,
			}) as typeof builder;
		}

		if (options.isUnique) {
			builder = builder.unique() as typeof builder;
		}

		if (options.references) {
			builder = builder.references(options.references, {
				onDelete: options.onDelete as any,
				onUpdate: options.onUpdate as any,
			}) as typeof builder;
		}

		if (options.defaultValue !== undefined) {
			builder = builder.default(options.defaultValue) as typeof builder;
		}

		if (!options.isOptional) {
			builder = builder.notNull() as typeof builder;
		}

		sqliteColumns[key] = builder;
	}

	return sqliteTable(name, sqliteColumns);
}

export { Table };
