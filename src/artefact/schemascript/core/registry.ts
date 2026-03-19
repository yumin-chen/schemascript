const registry: Record<string, any> = {};

/**
 * Retrieves a table from the registry by its name.
 * @param name The name of the table to retrieve.
 */
function getTableRegistry(name: string): any {
	return registry[name];
}

/**
 * Registers a table in the registry with the given name.
 * @param name The name of the table.
 * @param table The table instance to register.
 */
function setTableRegistry(name: string, table: any): void {
	registry[name] = table;
}

export { getTableRegistry, setTableRegistry };
