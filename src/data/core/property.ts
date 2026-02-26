class Property<DataType extends string, TData = unknown, TConfig = unknown> {
	constructor(
		public readonly _type: DataType,
		private readonly options: PropertyOptions<TData, TConfig> = {
			isOptional: false,
			isIdentifier: false,
			isUnique: false,
		},
	) {}

	getOptions(): PropertyOptions<TData, TConfig> {
		return { ...this.options };
	}

	private setOptions(
		updates: Partial<PropertyOptions<TData, TConfig>>,
	): Property<DataType, TData, TConfig> {
		return new Property(this._type, { ...this.options, ...updates });
	}

	default(value: TData): Property<DataType, TData, TConfig> {
		return this.setOptions({ defaultValue: value });
	}

	identifier(): Property<DataType, TData, TConfig> {
		return this.setOptions({ isIdentifier: true });
	}

	optional(): Property<DataType, TData | null, TConfig> {
		return this.setOptions({ isOptional: true });
	}

	unique(): Property<DataType, TData, TConfig> {
		return this.setOptions({ isUnique: true });
	}

	references(ref: () => unknown): Property<DataType, TData, TConfig> {
		return this.setOptions({ references: ref });
	}

	setMetadata(
		name?: string,
		config?: TConfig,
	): Property<DataType, TData, TConfig> {
		return this.setOptions({ name, config });
	}

	get type(): DataType {
		return this._type;
	}

	get name(): string | undefined {
		return this.options.name;
	}

	get config(): TConfig | undefined {
		return this.options.config;
	}

	get isOptional(): boolean {
		return this.options.isOptional;
	}

	get isIdentifier(): boolean {
		return this.options.isIdentifier;
	}

	get isUnique(): boolean {
		return this.options.isUnique;
	}

	get hasDefault(): boolean {
		return this.options.defaultValue !== undefined;
	}

	get defaultValue(): TData | undefined {
		return this.options.defaultValue;
	}

	toString(): string {
		const name = this.name ?? "unnamed";
		const identifier = this.isIdentifier ? ".identifier()" : "";
		const optional = this.isOptional ? ".optional()" : "";
		const unique = this.isUnique ? ".unique()" : "";
		const defaultVal = this.hasDefault
			? `.default(${typeof this.defaultValue === "bigint" ? this.defaultValue.toString() : JSON.stringify(this.defaultValue)})`
			: "";

		if (this._type === "enum") {
			const config = this.config as { options?: string[] } | undefined;
			const options = config?.options;
			if (options && Array.isArray(options)) {
				const values = options.map((v) => `\t\t\t"${v}",`).join("\n");
				return `enum("${name}",\n    {   options:\n\t\t[\n${values}\n\t\t]\n\t}\n   )${identifier}${optional}${unique}${defaultVal}`;
			}
		}

		return `${this._type}("${name}")${identifier}${optional}${unique}${defaultVal}`;
	}

	toJSON() {
		return {
			type: this._type,
			...this.options,
			hasDefault: this.hasDefault,
		};
	}
}

type PropertyOptions<TData = unknown, TConfig = unknown> = {
	name?: string;
	config?: TConfig;
	isOptional: boolean;
	isIdentifier: boolean;
	isUnique: boolean;
	defaultValue?: TData;
	autoIncrement?: boolean;
	references?: () => unknown;
};

type PropertyBuilder<
	DataType extends string = string,
	TData = unknown,
	TConfig = unknown,
> = (name: string, config?: TConfig) => Property<DataType, TData, TConfig>;

export { Property, type PropertyOptions, type PropertyBuilder };
