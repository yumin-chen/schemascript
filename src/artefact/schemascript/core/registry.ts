import { getTableColumns, relations } from "drizzle-orm";
import { createTableRelationsHelpers } from "drizzle-orm/relations";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { Property } from "./property";

/**
 * Internal type for a registered table entry.
 */
export interface RegistryEntry {
	alias: string;
	table: AnySQLiteTable;
	fields: Record<string, Property<string, any, any>>;
}

/**
 * Internal type for a relationship edge discovered from .references().
 */
export interface RelationEdge {
	fromAlias: string;
	fromColumn: AnySQLiteColumn;
	toAlias: string;
	toColumn: AnySQLiteColumn;
	fkPropertyName: string;
}

/**
 * Internal type for mapping relations to table aliases.
 */
export interface RelationMap {
	ones: Map<
		string,
		Array<{
			relationName: string;
			toAlias: string;
			fromColumn: AnySQLiteColumn;
			toColumn: AnySQLiteColumn;
		}>
	>;
	manies: Map<
		string,
		Array<{
			relationName: string;
			toAlias: string;
		}>
	>;
}

const registry = new Map<string, RegistryEntry>();
let cachedRelations: Record<string, any> | null = null;

/**
 * Registers a table into the SchemaRegistry.
 */
export function register(entry: RegistryEntry): void {
	registry.set(entry.alias, entry);
	cachedRelations = null;
}

/**
 * Resets the registry and cache. Internal use only (tests).
 */
export function _resetRegistry(): void {
	registry.clear();
	cachedRelations = null;
}

/**
 * Requirement 3.1: Implement collectEdges(registry)
 * Iterate each entry's fields, find properties where .reference is set, call the ref thunk,
 * match the returned column by identity (===) against columns in all registered tables.
 */
function collectEdges(registryMap: Map<string, RegistryEntry>): RelationEdge[] {
	const edges: RelationEdge[] = [];
	const allColumns = new Map<AnySQLiteColumn, string>();

	// Pre-map all columns to their table aliases
	for (const entry of registryMap.values()) {
		const columns = getTableColumns(entry.table);
		for (const column of Object.values(columns)) {
			allColumns.set(column as AnySQLiteColumn, entry.alias);
		}
	}

	for (const entry of registryMap.values()) {
		for (const [fieldName, prop] of Object.entries(entry.fields)) {
			if (prop.reference) {
				let toColumn: AnySQLiteColumn;
				try {
					toColumn = prop.reference.ref();
				} catch (e) {
					// Thunk might fail if it references a table that hasn't been fully initialized if called too early,
					// but here Table() calls register() after sqliteTable() is done.
					throw e;
				}
				const toAlias = allColumns.get(toColumn);

				if (!toAlias) {
					throw new Error(
						`Foreign key on '${entry.alias}.${fieldName}' references a column that is not part of any registered table.`,
					);
				}

				const fromColumns = getTableColumns(entry.table);
				const fromColumn = fromColumns[fieldName] as AnySQLiteColumn;

				edges.push({
					fromAlias: entry.alias,
					fromColumn,
					toAlias,
					toColumn,
					fkPropertyName: fieldName,
				});
			}
		}
	}

	return edges;
}

/**
 * Requirement 3.2: Implement buildRelationMaps(edges, registry)
 * group edges by source/target alias; apply _id-stripping rule for one names and child-alias rule for many names;
 * detect and resolve collisions by appending _${fkColumnName} suffix.
 */
function buildRelationMaps(edges: RelationEdge[]): RelationMap {
	const ones = new Map<string, Array<{
		relationName: string;
		toAlias: string;
		fromColumn: AnySQLiteColumn;
		toColumn: AnySQLiteColumn;
	}>>();
	const manies = new Map<string, Array<{
		relationName: string;
		toAlias: string;
	}>>();

	// Initialize maps for all tables mentioned in edges
	for (const edge of edges) {
		if (!ones.has(edge.fromAlias)) ones.set(edge.fromAlias, []);
		if (!ones.has(edge.toAlias)) ones.set(edge.toAlias, []);
		if (!manies.has(edge.fromAlias)) manies.set(edge.fromAlias, []);
		if (!manies.has(edge.toAlias)) manies.set(edge.toAlias, []);
	}

	for (const edge of edges) {
		// --- ONE Relation (source table) ---
		const oneBaseName = edge.fkPropertyName.endsWith("_id")
			? edge.fkPropertyName.slice(0, -3)
			: edge.fkPropertyName;

		const sourceOnes = ones.get(edge.fromAlias)!;
		const sourceManies = manies.get(edge.fromAlias)!;

		let oneName = oneBaseName;
		if (
			sourceOnes.some((o) => o.relationName === oneName) ||
			sourceManies.some((m) => m.relationName === oneName)
		) {
			oneName = `${oneBaseName}_${edge.fkPropertyName}`;
		}

		sourceOnes.push({
			relationName: oneName,
			toAlias: edge.toAlias,
			fromColumn: edge.fromColumn,
			toColumn: edge.toColumn,
		});

		// --- MANY Relation (target table) ---
		const manyBaseName = edge.fromAlias;
		const targetOnes = ones.get(edge.toAlias)!;
		const targetManies = manies.get(edge.toAlias)!;

		let manyName = manyBaseName;
		if (
			targetOnes.some((o) => o.relationName === manyName) ||
			targetManies.some((m) => m.relationName === manyName)
		) {
			manyName = `${manyBaseName}_${edge.fkPropertyName}`;
		}

		targetManies.push({
			relationName: manyName,
			toAlias: edge.fromAlias,
		});
	}

	return { ones, manies };
}

/**
 * Requirement 3.3: Implement computeRelations(registry)
 */
function computeRelations(
	registryMap: Map<string, RegistryEntry>,
): Record<string, any> {
	const edges = collectEdges(registryMap);
	const { ones, manies } = buildRelationMaps(edges);

	const tables: Record<string, AnySQLiteTable> = {};
	for (const entry of registryMap.values()) {
		tables[entry.alias] = entry.table;
	}

	return defineRelations(tables, (r) => {
		const result: Record<string, any> = {};
		// Use all registered tables
		for (const alias of registryMap.keys()) {
			const entry = registryMap.get(alias)!;
			const tableOnes = ones.get(alias) || [];
			const tableManies = manies.get(alias) || [];

			if (tableOnes.length === 0 && tableManies.length === 0) {
				continue;
			}

			result[alias] = relations(entry.table, () => {
				const helpers = createTableRelationsHelpers(entry.table);
				const rels: Record<string, any> = {};

				for (const o of tableOnes) {
					rels[o.relationName] = helpers.one(tables[o.toAlias], {
						fields: [o.fromColumn],
						references: [o.toColumn],
					});
				}

				for (const m of tableManies) {
					rels[m.relationName] = helpers.many(tables[m.toAlias]);
				}

				return rels;
			});
		}
		return result;
	});
}

/**
 * Requirement 3.3: Stub for defineRelations as per requirement 3.3.
 * Mimics Drizzle's future API for defining relations across multiple tables at once.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function defineRelations(
	tables: Record<string, AnySQLiteTable>,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	cb: (r: any) => Record<string, any>,
) {
	return cb(tables);
}

/**
 * Requirement 7.3, 7.4: Returns the inferred Drizzle relations for all registered tables.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function getRelations(): Record<string, any> {
	if (cachedRelations) {
		return cachedRelations;
	}

	// ALWAYS use the most up-to-date registry
	cachedRelations = computeRelations(new Map(registry));
	return cachedRelations;
}
