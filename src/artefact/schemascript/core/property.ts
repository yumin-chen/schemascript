import type { AnySQLiteColumn, SQL } from "@/data/proxies/sqlite";
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
				isOptional: false,
				isIdentifier: false,
			},
	) { }

	getOptions(): PropertyOptions<JavaScriptType, EnumOptionType> {
		return { ...this.options };
	}

	private setOptions(
		updates: Partial<PropertyOptions<JavaScriptType, EnumOptionType>>,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return new Property(this._type, { ...this.options, ...updates });
	}

	init<T extends JavaScriptType = JavaScriptType>(): Property<
		TypeName,
		T,
		EnumOptionType
	> {
		return this as unknown as Property<TypeName, T, EnumOptionType>;
	}

	finalise<T extends JavaScriptType = JavaScriptType>(
		name: string,
	): Property<TypeName, T, EnumOptionType> {
		return this.setOptions({ name }) as Property<TypeName, T, EnumOptionType>;
	}

	enumOptions(
		enumOptions: EnumOptionType,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({ enumOptions });
	}

	default(
		value: JavaScriptType | SQL,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({ defaultValue: value });
	}

	identifier(
		this: Property<Exclude<TypeName, "enum">, JavaScriptType, EnumOptionType>,
		config?: TypeName extends "integer" ? { autoIncrement: boolean } : never,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this._type === "enum") {
			throw new Error("Enums cannot be identifiers.");
		}
		return this.setOptions({
			isIdentifier: true,
			autoIncrement: config?.autoIncrement,
		}) as Property<TypeName, JavaScriptType, EnumOptionType>;
	}

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		return this.setOptions({ isOptional: true });
	}

	unique(): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({ isUnique: true });
	}

	array(): Property<TypeName, JavaScriptType[], EnumOptionType> {
		return this.setOptions({ isArray: true }) as Property<
			TypeName,
			JavaScriptType[],
			EnumOptionType
		>;
	}

	references(
		ref: () => AnySQLiteColumn,
		actions?: ReferenceActions,
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({
			references: {
				ref,
				actions,
			},
		});
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
		return this.options.isOptional;
	}

	get isIdentifier(): boolean {
		return this.options.isIdentifier;
	}

	get isAutoIncrement(): boolean {
		return !!this.options.autoIncrement;
	}

	get isUnique(): boolean {
		return !!this.options.isUnique;
	}

	get isArray(): boolean {
		return !!this.options.isArray;
	}

	get reference(): PropertyOptions["references"] {
		return this.options.references;
	}

	get hasDefault(): boolean {
		return this.options.defaultValue !== undefined;
	}

	get defaultValue(): JavaScriptType | SQL | undefined {
		return this.options.defaultValue;
	}

	toString(): string {
		const name = this.name ?? "unnamed";
		const optional = this.isOptional ? ".optional()" : "";
		const unique = this.isUnique ? ".unique()" : "";
		const array = this.isArray ? ".array()" : "";
		let references = "";
		if (this.reference) {
			const actions = this.reference.actions;
			const actionParts: string[] = [];
			if (actions?.onUpdate)
				actionParts.push(`onUpdate: '${actions.onUpdate}'`);
			if (actions?.onDelete)
				actionParts.push(`onDelete: '${actions.onDelete}'`);
			const actionStr =
				actionParts.length > 0 ? `, { ${actionParts.join(", ")} }` : "";
			references = `.references(...${actionStr})`;
		}
		const defaultVal = this.hasDefault
			? `.default(${typeof this.defaultValue === "bigint" ? this.defaultValue.toString() : JSON.stringify(this.defaultValue)})`
			: "";

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )${optional}${unique}${array}${references}${defaultVal}`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )${optional}${unique}${array}${references}${defaultVal}`;
				}
			}
		}

		const identifier = this.isIdentifier
			? this.isAutoIncrement
				? ".identifier({ autoIncrement: true })"
				: ".identifier()"
			: "";
		return `${this._type}("${name}")${identifier}${optional}${unique}${array}${references}${defaultVal}`;
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
			case "timestamp":
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
				if (this.isArray) {
					typeStr = `(${typeStr})`;
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
			hasDefault: this.hasDefault,
		};
	}
}

type PropertyOptions<JavaScriptType = unknown, EnumOptionType = unknown> = {
	name?: string;
	enumOptions?: EnumOptionType;
	isOptional: boolean;
	isIdentifier: boolean;
	autoIncrement?: boolean;
	isUnique?: boolean;
	isArray?: boolean;
	defaultValue?: JavaScriptType | SQL;
	references?: {
		ref: () => AnySQLiteColumn;
		actions?: ReferenceActions;
	};
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> = (
	config?: EnumOptionType,
) => Property<TypeName, JavaScriptType, EnumOptionType>;

type ReferenceAction =
	| "cascade"
	| "restrict"
	| "no action"
	| "set null"
	| "set default";

type ReferenceActions = {
	onUpdate?: ReferenceAction;
	onDelete?: ReferenceAction;
};

export {
	Property,
	type PropertyOptions,
	type PropertyBuilder,
	type ReferenceAction,
	type ReferenceActions,
};
