import type { FieldBuilder } from "./field";
import { field } from "./field";
import type { Property } from "./property";

function Schema<TName extends string>(
	name: TName,
	schemaBuilder: SchemaBuilder,
) {
	const rawFields = schemaBuilder(field);
	const fields = Object.fromEntries(
		Object.entries(rawFields).map(([key, prop]) => [
			key,
			(typeof prop === "function" ? prop() : prop).finalise(key),
		]),
	);

	const schema = {
		_name: name,
		fields,

		toString() {
			const fieldDescriptions = Object.entries(fields)
				.map(([_key, prop]) => `   ${prop.toString()}`)
				.join(",\n");

			return `Schema: ${name}\n{\n${fieldDescriptions}\n}`;
		},

		toTypeScriptInterface(): string {
			const interfaceName = name.charAt(0).toUpperCase() + name.slice(1);
			const fieldDefinitions = Object.entries(fields)
				.map(([key, prop]) => {
					const type = prop.toTypeScriptType();
					return `  ${key}: ${type};`;
				})
				.join("\n");

			return `interface ${interfaceName} {\n${fieldDefinitions}\n}`;
		},

		toJSON() {
			return {
				name,
				fields: Object.fromEntries(
					Object.entries(fields).map(([key, prop]) => [key, prop.toJSON()]),
				),
			};
		},
	};

	return schema;
}

type SchemaBuilder = (
	prop: FieldBuilder,
) => Record<
	string,
	Property<string, unknown, unknown> | PropertyBuilder<string, unknown, unknown>
>;

export { Schema, type SchemaBuilder };
