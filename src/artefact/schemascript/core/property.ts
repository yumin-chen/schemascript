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
		> = {
			isUnique: false,
			isOptional: false,
		},
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

	unique(): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isUnique) return this;
		return this.setOptions({ isUnique: true });
	}

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		if (this.isOptional) return this;
		return this.setOptions({ isOptional: true });
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

	get isOptional(): boolean {
		return !!this.options.isOptional;
	}

	get isUnique(): boolean {
		return !!this.options.isUnique;
	}

	toString(): string {
		const name = this.name ?? "unnamed";
		const unique = this.isUnique ? ".unique()" : "";
		const optional = this.isOptional ? ".optional()" : "";

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )${optional}${unique}`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )${optional}${unique}`;
				}
			}
		}

		return `${this._type}("${name}")${optional}${unique}`;
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
			case "boolean":
				typeStr = "boolean";
				break;
			case "blob":
				typeStr = "Uint8Array";
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

		if (this.isOptional) {
			typeStr = `${typeStr} | null`;
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

type PropertyOptions<_JavaScriptType = unknown, EnumOptionType = unknown> = {
	name?: string;
	enumOptions?: EnumOptionType;
	isUnique?: boolean;
	isOptional?: boolean;
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> = (
	config?: EnumOptionType,
) => Property<TypeName, JavaScriptType, EnumOptionType>;

export { Property, type PropertyOptions, type PropertyBuilder };
