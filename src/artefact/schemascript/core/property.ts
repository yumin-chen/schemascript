import { deepFreeze } from "@/utils/freeze";
import type { primitive } from "./primitive";

class Property<
	TypeName extends string,
	JavaScriptType = primitive,
	EnumOptionType = never,
> {
	constructor(
		private readonly _type: TypeName,
		private readonly options: PropertyOptions<
			JavaScriptType,
			EnumOptionType
		> = {},
	) {}

	getOptions(): PropertyOptions<JavaScriptType, EnumOptionType> {
		return { ...this.options };
	}

	private setOptions(
		updates: Partial<PropertyOptions<JavaScriptType, EnumOptionType>>,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return new Property(this._type, { ...this.options, ...updates });
	}

	init<T extends JavaScriptType = JavaScriptType>(): Property<TypeName, T> {
		return this as Property<TypeName, T>;
	}

	finalise<T extends JavaScriptType = JavaScriptType>(
		name: string,
	): Property<TypeName, T, EnumOptionType> {
		const finalised = this.setOptions({ name }) as Property<
			TypeName,
			T,
			EnumOptionType
		>;
		return deepFreeze(finalised);
	}

	enumOptions(
		enumOptions: EnumOptionType,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({ enumOptions });
	}

	get type(): TypeName {
		return this._type;
	}

	get name(): string | undefined {
		return this.options.name;
	}

	get enumConfigs(): EnumOptionType | undefined {
		return this.options.enumOptions;
	}

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		return this.setOptions({ isOptional: true }) as Property<
			TypeName,
			JavaScriptType | null,
			EnumOptionType
		>;
	}

	toString(): string {
		const name = this.name ?? "unnamed";

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )`;
				}
			}
		}

		let str = `${this._type}("${name}")`;
		if (this.options.isOptional) str += ".optional()";
		if (this.options.isUnique) str += ".unique()";
		if (this.options.isIdentifier) str += ".identifier()";
		if (this.options.references) str += ".references()";
		if (this.options.defaultValue !== undefined) str += ".default()";
		return str;
	}

	toTypeScriptType(): string {
		let typeStr: string;
		switch (this._type) {
			case "integer":
				typeStr = "bigint";
				break;
			case "real":
				typeStr = "number";
				break;
			case "text":
				typeStr = "string";
				break;
			case "blob":
				typeStr = "Uint8Array";
				break;
			case "boolean":
				typeStr = "boolean";
				break;
			case "datetime":
				typeStr = "Date";
				break;
			case "node":
				typeStr = "object";
				break;
			case "enum": {
				const config = this.enumConfigs as
					| { options?: string[] | Record<string, number> }
					| undefined;
				const options = config?.options;
				if (options) {
					if (Array.isArray(options)) {
						typeStr = options.map((v) => `"${v}"`).join(" | ");
					} else {
						typeStr = Object.keys(options)
							.map((v) => `"${v}"`)
							.join(" | ");
					}
				} else {
					typeStr = "string | number";
				}
				break;
			}
			default:
				typeStr = "unknown";
		}

		if (this.options.isOptional) {
			typeStr += " | null";
		}

		return typeStr;
	}

	toJSON() {
		return {
			type: this._type,
			...this.options,
		};
	}
}

type PropertyOptions = {
	name?: string;
	enumOptions?: EnumOptionType;
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> = (
	config?: EnumOptionType,
) => Property<TypeName, JavaScriptType, EnumOptionType>;

export { Property, type PropertyBuilder, type PropertyOptions };
