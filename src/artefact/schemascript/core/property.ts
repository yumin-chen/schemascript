import { SQL } from "drizzle-orm";
import type { AnySQLiteColumn, SQL as SQLType } from "@/data/proxies/sqlite";
import { deepFreeze } from "@/utils/freeze";
import type { primitive } from "./primitive";

type ReferenceActions =
	| "cascade"
	| "restrict"
	| "no action"
	| "set null"
	| "set default";

type ReferenceOptions = {
	ref: () => AnySQLiteColumn;
	onDelete?: ReferenceActions;
	onUpdate?: ReferenceActions;
};

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
			isIdentifier: false,
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

	array(): Property<TypeName, JavaScriptType[], EnumOptionType> {
		if (this.isArray)
			return this as unknown as Property<
				TypeName,
				JavaScriptType[],
				EnumOptionType
			>;
		return this.setOptions({ isArray: true }) as unknown as Property<
			TypeName,
			JavaScriptType[],
			EnumOptionType
		>;
	}

	unique(): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isUnique) return this;
		return this.setOptions({ isUnique: true });
	}

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		if (this.isOptional) return this;
		return this.setOptions({ isOptional: true });
	}

	identifier(options?: {
		autoIncrement?: boolean;
	}): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isIdentifier && this.options.identifierOptions === options)
			return this;
		return this.setOptions({ isIdentifier: true, identifierOptions: options });
	}

	references(
		ref: () => AnySQLiteColumn,
		actions?: { onDelete?: ReferenceActions; onUpdate?: ReferenceActions },
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({
			references: { ref, ...actions },
		});
	}

	default(
		value: JavaScriptType | SQL,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({ default: value });
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

	get isIdentifier(): boolean {
		return !!this.options.isIdentifier;
	}

	get isArray(): boolean {
		return !!this.options.isArray;
	}

	get identifierConfigs(): { autoIncrement?: boolean } | undefined {
		return this.options.identifierOptions;
	}

	toString(): string {
		const name = this.name ?? "unnamed";
		const unique = this.isUnique ? ".unique()" : "";
		const optional = this.isOptional ? ".optional()" : "";
		const array = this.isArray ? ".array()" : "";
		let identifier = "";
		if (this.isIdentifier) {
			identifier = ".identifier()";
			if (this.identifierConfigs?.autoIncrement) {
				identifier = ".identifier({ autoIncrement: true })";
			}
		}

		let references = "";
		if (this.options.references) {
			const { onDelete, onUpdate } = this.options.references;
			const actions: string[] = [];
			if (onDelete) actions.push(`onDelete: "${onDelete}"`);
			if (onUpdate) actions.push(`onUpdate: "${onUpdate}"`);
			const actionsStr =
				actions.length > 0 ? `, { ${actions.join(", ")} }` : "";
			references = `.references(() => ...${actionsStr})`;
		}

		let defaultValue = "";
		if (this.options.default !== undefined) {
			const val = this.options.default;
			if (typeof val === "string") {
				defaultValue = `.default("${val}")`;
			} else if (
				val instanceof SQL ||
				(val && typeof val === "object" && "queryChunks" in val)
			) {
				defaultValue = ".default(sql`...`)";
			} else {
				defaultValue = `.default(${val})`;
			}
		}

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )${optional}${unique}${identifier}${defaultValue}`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )${optional}${unique}${array}${identifier}${defaultValue}`;
				}
			}
		}

		return `${this._type}("${name}")${optional}${unique}${array}${identifier}${defaultValue}${references}`;
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

		if (this.isArray) {
			typeStr = `${typeStr}[]`;
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

type PropertyOptions<JavaScriptType = unknown, EnumOptionType = unknown> = {
	name?: string;
	enumOptions?: EnumOptionType;
	isUnique?: boolean;
	isOptional?: boolean;
	isArray?: boolean;
	isIdentifier?: boolean;
	identifierOptions?: { autoIncrement?: boolean };
	references?: ReferenceOptions;
	default?: JavaScriptType | SQLType;
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> = (
	config?: EnumOptionType,
) => Property<TypeName, JavaScriptType, EnumOptionType>;

export {
	Property,
	type PropertyOptions,
	type PropertyBuilder,
	type ReferenceOptions,
	type ReferenceActions,
};
