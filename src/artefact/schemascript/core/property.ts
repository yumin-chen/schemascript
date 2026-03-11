import type { AnySQLiteColumn } from "@/data/proxies/sqlite";
import { deepFreeze } from "@/utils/freeze";
import type { primitive } from "./primitive";

export type ReferenceActions =
	| "cascade"
	| "restrict"
	| "no action"
	| "set null"
	| "set default";

export type ReferenceOptions = {
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

	optional(): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isOptional) return this;
		return this.setOptions({ isOptional: true });
	}

	unique(): Property<TypeName, JavaScriptType, EnumOptionType> {
		if (this.isUnique) return this;
		return this.setOptions({ isUnique: true });
	}

	optional(): Property<TypeName, JavaScriptType | null, EnumOptionType> {
		if (this.isOptional) return this;
		return this.setOptions({ isOptional: true });
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
		if (this.isIdentifier) return this;
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
			identifierOptions: config,
		}) as Property<TypeName, JavaScriptType, EnumOptionType>;
	}

	references(
		ref: () => AnySQLiteColumn,
		actions?: { onDelete?: ReferenceActions; onUpdate?: ReferenceActions },
	): Property<TypeName, JavaScriptType, EnumOptionType> {
		return this.setOptions({
			references: { ref, ...actions },
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
		return !!this.options.isOptional;
	}

	get isUnique(): boolean {
		return !!this.options.isUnique;
	}

	get isIdentifier(): boolean {
		return !!this.options.isIdentifier;
	}

	get identifierConfigs(): { autoIncrement?: boolean } | undefined {
		return this.options.identifierOptions;
	}

	get isAutoIncrement(): boolean {
		return !!this.options.identifierOptions?.autoIncrement;
	}

	get reference():
		| {
				ref: () => AnySQLiteColumn;
				actions?: { onDelete?: ReferenceActions; onUpdate?: ReferenceActions };
		  }
		| undefined {
		const r = this.options.references;
		if (!r) return undefined;

		const hasActions = r.onDelete !== undefined || r.onUpdate !== undefined;
		return {
			ref: r.ref,
			actions: hasActions
				? { onDelete: r.onDelete, onUpdate: r.onUpdate }
				: undefined,
		};
	}

	toString(): string {
		const name = this.name ?? "unnamed";
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
				actionParts.push(`onUpdate: "${actions.onUpdate}"`);
			if (actions?.onDelete)
				actionParts.push(`onDelete: "${actions.onDelete}"`);
			const actionStr =
				actionParts.length > 0 ? `, { ${actionParts.join(", ")} }` : "";
			references = `.references(() => ...${actionStr})`;
		}

		if (this._type === "enum") {
			const config = this.enumConfigs as
				| { options?: string[] | Record<string, number> }
				| undefined;
			const options = config?.options;
			if (options) {
				if (Array.isArray(options)) {
					const values = options.map((v) => `"${v}"`).join(", ");
					return `enum("${name}",\n    {   options:\n\t\t\t[${values}]\n\t}\n   )${optional}${unique}${identifier}`;
				}
				if (typeof options === "object") {
					const values = Object.entries(options)
						.map(([k, v]) => `\t\t\t\t${k}: ${v},`)
						.join("\n");
					return `enum("${name}",\n    {   options:\n\t\t\t{\n${values}\n\t\t\t}\n\t\t}\n   )${optional}${unique}${identifier}`;
				}
			}
		}

		return `${this._type}("${name}")${optional}${unique}${identifier}${references}`;
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
	isIdentifier?: boolean;
	identifierOptions?: { autoIncrement?: boolean };
	references?: ReferenceOptions;
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
	EnumOptionType = unknown,
> = (
	config?: EnumOptionType,
) => Property<TypeName, JavaScriptType, EnumOptionType>;

export { Property, type PropertyOptions, type PropertyBuilder };
