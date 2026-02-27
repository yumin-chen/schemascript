import type { FieldBuilder } from "./field";
import { field } from "./field";
import type { Property } from "./property";

declare const __host_predict_call: (prompt: string, schema: string) => string;

function Schema<TName extends string>(
	name: TName,
	schemaBuilder: SchemaBuilder,
) {
	const fields = schemaBuilder(field);

	const schema = {
		_name: name,
		fields,

		toString() {
			const fieldDescriptions = Object.entries(fields)
				.map(([key, prop]) => {
					const colName = prop.name ?? key;
					const optional = prop.isOptional ? ".optional()" : "";
					const defaultVal = prop.hasDefault
						? `.default(${typeof prop.defaultValue === "bigint" ? prop.defaultValue.toString() : JSON.stringify(prop.defaultValue)})`
						: "";

					switch (prop.type) {
						case "enum": {
							const config = prop.config as
								| { options?: Record<string, number> }
								| undefined;
							const options = config?.options;
							if (options && typeof options === "object") {
								const values = Object.keys(options)
									.map((v) => `\t\t\t\t"${v}",`)
									.join("\n");
								return `   enum("${colName}",\n    {   options:\n\t\t\t[\n${values}\n\t\t\t]\n\t}\n   )${optional}${defaultVal}`;
							}
						}
					}
					const identifier = prop.isIdentifier ? ".identifier()" : "";
					const unique = prop.isUnique ? ".unique()" : "";

					return `   ${prop.type}("${colName}")${identifier}${optional}${unique}${defaultVal}`;
				})
				.join(",\n");

			return `Schema: ${name}\n{\n${fieldDescriptions}\n}`;
		},

		toJSON() {
			return {
				name,
				fields: Object.fromEntries(
					Object.entries(fields).map(([key, prop]) => [key, prop.toJSON()]),
				),
			};
		},

		async predict(prompt: string) {
			const schemaJson = JSON.stringify(this.toJSON());
			const response = __host_predict_call(prompt, schemaJson);
			try {
				return JSON.parse(response);
			} catch (_e) {
				return response;
			}
		},
	};

	return schema;
}

type SchemaBuilder = (
	prop: FieldBuilder,
) => Record<string, Property<string, unknown, unknown>>;

export { Schema, type SchemaBuilder };
