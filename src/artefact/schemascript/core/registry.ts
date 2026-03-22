const tables = new Map<string, any>();

export function setTableRegistry(name: string, table: any) {
	tables.set(name, table);
}

export function getTableRegistry(name: string): any {
	return tables.get(name);
}

export function clearTableRegistry() {
	tables.clear();
}

export function table<T = any>(name: string): T {
	const t = getTableRegistry(name);
	if (!t) {
		throw new Error(`Table "${name}" not found in registry.`);
	}
	return t;
}
