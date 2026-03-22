import type { primitive } from "@/data/proxies/sqlite";
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

const tableRegistry = new Map<string, any>();

function table(name: string) {
	const t = tableRegistry.get(name);
	if (!t) {
		throw new Error(`Table "${name}" not found in registry.`);
	}
	return t;
}

function Table(name: string, schemaBuilder: SchemaBuilder) {
	const rawFields = schemaBuilder(field);
	const fields = Object.fromEntries(
		Object.entries(rawFields).map(([key, prop]) => [
			key,
			(typeof prop === "function" ? prop() : prop).finalise(key),
		]),
	);
	const sqliteColumns: Record<string, primitive> = {};

	for (const [key, prop] of Object.entries(fields)) {
		const columnName = prop.name ?? key;
		let builder: primitive;

		if (prop.isArray) {
			const base = blob(columnName, { mode: "json" });
			switch (prop.type) {
				case "integer":
					builder = base.$type<{ payload: bigint[] }>();
					break;
				case "real":
					builder = base.$type<{ payload: number[] }>();
					break;
				case "text":
					builder = base.$type<{ payload: string[] }>();
					break;
				case "boolean":
					builder = base.$type<{ payload: boolean[] }>();
					break;
				case "blob":
					builder = base.$type<{ payload: Uint8Array[] }>();
					break;
				case "datetime":
					builder = base.$type<{ payload: Date[] | bigint[] | string[] }>();
					break;
				case "node":
					builder = base.$type<{ payload: object[] }>();
					break;
				case "enum":
					builder = base.$type<{ payload: string[] | number[] }>();
					break;
				default:
					throw new Error(`Unsupported type: ${prop.type}`);
			}
		} else {
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
				case "boolean":
					builder = integer(columnName, { mode: "boolean" });
					break;
				case "blob":
					builder = blob(columnName, { mode: "buffer" });
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
							options.forEach((option, i) => {
								mapping[option] = i;
								reverseMapping[i] = option;
							});
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
								const result = reverseMapping[value];
								if (result === undefined) {
									throw new Error(`Unknown enum value from driver: ${value}`);
								}
								return result;
							},
							toDriver(value: string) {
								const result = mapping[value];
								if (result === undefined) {
									throw new Error(`Unknown enum value to driver: ${value}`);
								}
								return result;
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
		}

		if (prop.isIdentifier) {
			builder = builder.primaryKey({
				autoIncrement: prop.isAutoIncrement,
			}) as typeof builder;
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

		if (prop.reference) {
			builder = builder.references(
				prop.reference.ref,
				prop.reference.actions,
			) as typeof builder;
		}

		sqliteColumns[key] = builder;
	}

	const t = sqliteTable(name, sqliteColumns);
	tableRegistry.set(name, t);
	return t;
}

export { Table, table };
