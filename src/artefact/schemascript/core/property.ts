import { deepFreeze } from "@/utils/freeze";
import type { primitive } from "./primitive";

class Property<TypeName extends string, JavaScriptType = primitive> {
	constructor(
		private readonly _type: TypeName,
		private readonly options: PropertyOptions<JavaScriptType> = {},
	) {}

	getOptions(): PropertyOptions<JavaScriptType> {
		return { ...this.options };
	}

	private setOptions(
		updates: Partial<PropertyOptions<JavaScriptType>>,
	): Property<TypeName, JavaScriptType> {
		return new Property(this._type, { ...this.options, ...updates });
	}

	init<T extends JavaScriptType = JavaScriptType>(): Property<TypeName, T> {
		return this as unknown as Property<TypeName, T>;
	}

	finalise<T extends JavaScriptType = JavaScriptType>(
		name: string,
	): Property<TypeName, T> {
		const finalised = this.setOptions({ name }) as Property<TypeName, T>;
		return deepFreeze(finalised);
	}

	get type(): TypeName {
		return this._type;
	}

	get name(): string | undefined {
		return this.options.name;
	}

	toString(): string {
		const name = this.name ?? "unnamed";
		return `${this._type}("${name}")`;
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
			default:
				typeStr = "unknown";
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

type PropertyOptions<_JavaScriptType = unknown> = {
	name?: string;
};

type PropertyBuilder<
	TypeName extends string = string,
	JavaScriptType = unknown,
> = () => Property<TypeName, JavaScriptType>;

export { Property, type PropertyOptions, type PropertyBuilder };
