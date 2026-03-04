import type {
	AnySQLiteColumnBuilder,
	primitive as DrizzlePrimitive,
} from "@/data/proxies/sqlite";
import {
	blob,
	customType,
	integer,
	real,
	sqliteTable,
	text,
} from "@/data/proxies/sqlite";
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
		let builder: AnySQLiteColumnBuilder;

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
			case "node":
				builder = blob(columnName, { mode: "json" }).$type<object>();
				break;
			case "enum": {
				const config = prop.enumConfigs as
					| { options: string[] | Record<string, number> }
					| undefined;

				if (config?.options) {
					let mapping: Record<string, number>;
					const reverseMapping: Record<number, string> = {};

					if (Array.isArray(config.options)) {
						const options = config.options;
						mapping = {};
						for (let i = 0; i < options.length; i++) {
							mapping[options[i]] = i;
							reverseMapping[i] = options[i];
						}
					} else {
						mapping = config.options;
						for (const [k, v] of Object.entries(mapping)) {
							reverseMapping[v] = k;
						}
					}

					const EnumType = customType<{
						data: string;
						driverData: number;
					}>({
						dataType() {
							return "integer";
						},
						fromDriver(value: number) {
							return reverseMapping[value];
						},
						toDriver(value: string) {
							return mapping[value];
						},
					});
					builder = EnumType(columnName);
				} else {
					builder = integer(columnName);
				}
				break;
			}
			default:
				throw new Error(`Unsupported type: ${prop.type}`);
		}

		if (!prop.isOptional) {
			builder = builder.notNull() as typeof builder;
		}

		if (prop.isUnique) {
			builder = builder.unique() as typeof builder;
		}

		sqliteColumns[key] = builder as unknown as DrizzlePrimitive;
	}

	return sqliteTable(name, sqliteColumns);
}

export { Table };
