import type { AnySQLiteColumn, SQL } from "@/data/proxies/sqlite";
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

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		if (this.isOptional)
			return this as unknown as Property<
				TypeName,
				JavaScriptType | null,
				EnumOptionType
			>;
		return this.setOptions({ isOptional: true });
	}

	unique(): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isUnique) return this;
		return this.setOptions({ isUnique: true });
	}

	array(): Property<TypeName, JavaScriptType[], EnumOptionType> {
		if (this.isArray)
			return this as unknown as Property<
				TypeName,
				JavaScriptType[],
				EnumOptionType
			>;
		if (this.isIdentifier) {
			throw new Error("Identifiers cannot be arrays.");
		}
		return this.setOptions({ isArray: true }) as Property<
			TypeName,
			JavaScriptType[],
			EnumOptionType
		>;
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
		if (this.isIdentifier)
			return this as unknown as Property<
				TypeName,
				JavaScriptType,
				EnumOptionType
			>;
		if (this._type === "enum") {
			throw new Error("Enums cannot be identifiers.");
		}
		if (this.isArray) {
			throw new Error("Arrays cannot be identifiers.");
		}
		if (config?.autoIncrement && this._type !== "integer") {
			throw new Error("autoIncrement can only be used with integer fields.");
		}
		return this.setOptions({
			isIdentifier: true,
			autoIncrement: (config as { autoIncrement?: boolean })?.autoIncrement,
		}) as Property<TypeName, JavaScriptType, EnumOptionType>;
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

	get isUnique(): boolean {
		return !!this.options.isUnique;
	}

	get isArray(): boolean {
		return !!this.options.isArray;
	}

	get isIdentifier(): boolean {
		return !!this.options.isIdentifier;
	}

	get isAutoIncrement(): boolean {
		return !!this.options.autoIncrement;
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
		const identifier = this.isIdentifier
			? this.isAutoIncrement
				? ".identifier({ autoIncrement: true })"
				: ".identifier()"
			: "";
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
			? `.default(${
					this.defaultValue &&
					typeof this.defaultValue === "object" &&
					"queryChunks" in this.defaultValue
						? "sql`...`"
						: typeof this.defaultValue === "bigint"
							? this.defaultValue.toString()
							: JSON.stringify(this.defaultValue)
				})`
			: "";

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )${optional}${unique}${array}${identifier}${references}${defaultVal}`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )${optional}${unique}${array}${identifier}${references}${defaultVal}`;
				}
			}
		}

		return `${this._type}("${name}")${optional}${unique}${array}${identifier}${references}${defaultVal}`;
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
	isUnique?: boolean;
	isArray?: boolean;
	isIdentifier?: boolean;
	autoIncrement?: boolean;
	defaultValue?: JavaScriptType | SQL;
	references?: {
		ref: () => AnySQLiteColumn;
		actions?: ReferenceActions;
	};
};

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

interface PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> {
	(config?: EnumOptionType): Property<TypeName, JavaScriptType, EnumOptionType>;
	optional(): PropertyBuilder<TypeName, JavaScriptType | null, EnumOptionType>;
	unique(): PropertyBuilder<TypeName, JavaScriptType, EnumOptionType>;
	array(): PropertyBuilder<TypeName, JavaScriptType[], EnumOptionType>;
	identifier(
		config?: TypeName extends "integer" ? { autoIncrement: boolean } : never,
	): PropertyBuilder<TypeName, JavaScriptType, EnumOptionType>;
	default(
		value: JavaScriptType | SQL,
	): PropertyBuilder<TypeName, JavaScriptType, EnumOptionType>;
	references(
		ref: () => AnySQLiteColumn,
		actions?: ReferenceActions,
	): PropertyBuilder<TypeName, JavaScriptType, EnumOptionType>;
}

function makeBuilder<
	TypeName extends string,
	JavaScriptType,
	EnumOptionType = unknown,
>(
	property: Property<TypeName, JavaScriptType, EnumOptionType>,
): PropertyBuilder<TypeName, JavaScriptType, EnumOptionType> {
	const builder = ((config?: EnumOptionType) => {
		if (config) {
			return property.enumOptions(config);
		}
		return property;
	}) as PropertyBuilder<TypeName, JavaScriptType, EnumOptionType>;

	builder.optional = () =>
		makeBuilder(
			property.optional() as unknown as Property<
				TypeName,
				JavaScriptType | null,
				EnumOptionType
			>,
		);
	builder.unique = () => makeBuilder(property.unique());
	builder.array = () =>
		makeBuilder(
			property.array() as unknown as Property<
				TypeName,
				JavaScriptType[],
				EnumOptionType
			>,
		);
	builder.identifier = (
		config?: TypeName extends "integer" ? { autoIncrement: boolean } : never,
	) =>
		makeBuilder(
			(
				property as unknown as any
			).identifier(
				config as unknown as TypeName extends "integer"
					? { autoIncrement: boolean }
					: never,
			) as unknown as Property<TypeName, JavaScriptType, EnumOptionType>,
		);
	builder.default = (value: JavaScriptType | SQL) =>
		makeBuilder(property.default(value));
	builder.references = (
		ref: () => AnySQLiteColumn,
		actions?: ReferenceActions,
	) => makeBuilder(property.references(ref, actions));

	return builder;
}

export {
	Property,
	type PropertyOptions,
	type PropertyBuilder,
	type ReferenceAction,
	type ReferenceActions,
	makeBuilder,
};
