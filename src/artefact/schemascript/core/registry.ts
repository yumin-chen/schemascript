const tables = new Map<string, any>();

export const SchemaRegistry = {
	register(name: string, table: any) {
		tables.set(name, table);
	},
	get(name: string): any {
		return tables.get(name);
	},
	clear() {
		tables.clear();
	},
};

export function table<T = any>(name: string): T {
	const t = SchemaRegistry.get(name);
	if (!t) {
		throw new Error(`Table "${name}" not found in registry.`);
	}
	return t;
}
