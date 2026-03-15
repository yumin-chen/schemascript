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

const registry = new Map<string, any>();

function table(name: string) {
	return new Proxy(
		{},
		{
			get(_target, prop) {
				const registeredTable = registry.get(name);
				if (!registeredTable) {
					throw new Error(`Table "${name}" not found in registry.`);
				}
				return registeredTable[prop];
			},
		},
	) as any;
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
	registry.set(name, t);

	// Attach Schemascript property metadata to the Drizzle table columns
	// This ensures that Table().authorId has the .reference property
	for (const [key, prop] of Object.entries(fields)) {
		const column = t[key as keyof typeof t];
		if (column) {
			Object.assign(column, {
				get type() { return prop.type; },
				get name() { return prop.name; },
				get enumConfigs() { return prop.enumConfigs; },
				get isOptional() { return prop.isOptional; },
				get isUnique() { return prop.isUnique; },
				get isArray() { return prop.isArray; },
				get isIdentifier() { return prop.isIdentifier; },
				get isAutoIncrement() { return prop.isAutoIncrement; },
				get reference() { return prop.reference; },
				get hasDefault() { return prop.hasDefault; },
				get defaultValue() { return prop.defaultValue; },
				toString: () => prop.toString(),
				toTypeScriptType: () => prop.toTypeScriptType(),
				toJSON: () => prop.toJSON(),
			});
		}
	}

	return t;
}

export { Table, table };
