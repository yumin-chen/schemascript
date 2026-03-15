import { describe, expect, it, beforeEach } from "bun:test";
import { Table } from "./table";
import { _resetRegistry, getRelations, defineRelations } from "./registry";
import * as fc from "fast-check";
import { relations } from "drizzle-orm";
import { createTableRelationsHelpers } from "drizzle-orm/relations";

describe("Relations Inference (Property)", () => {
	beforeEach(() => {
		_resetRegistry();
	});

	// Feature: drizzle-relations-inference, Property 2: One-relation per FK column
	it("Property 2: One-relation per FK column", async () => {
		await fc.assert(
			fc.property(
				fc.array(
					fc.record({
						alias: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
						fkCount: fc.integer({ min: 1, max: 5 }),
					}),
					{ minLength: 2, maxLength: 5 }
				),
				(tablesData) => {
					_resetRegistry();

					const aliases = tablesData.map(t => t.alias);
					const uniqueAliases = Array.from(new Set(aliases));
					if (uniqueAliases.length < 2) return true;

					const tables: any[] = [];
					for (const alias of uniqueAliases) {
						const t = Table(alias, (prop) => ({
							id: prop.integer().identifier(),
						}));
						tables.push({ alias, table: t });
					}

					const fkTables: string[] = [];
					let expectedOneCount = 0;

					for (let i = 1; i < uniqueAliases.length; i++) {
						const alias = uniqueAliases[i];
						const parent = tables[0];
						const fkCount = tablesData.find(t => t.alias === alias)!.fkCount;

						const fkAlias = `${alias}_fk`;
						Table(fkAlias, (prop) => {
							const fields: any = {
								id: prop.integer().identifier(),
							};
							for (let j = 0; j < fkCount; j++) {
								fields[`fk_${j}_id`] = prop.integer().references(() => parent.table.id);
								expectedOneCount++;
							}
							return fields;
						});
						fkTables.push(fkAlias);
					}

					const rels = getRelations();
					let actualOneCount = 0;
					for (const fkTableAlias of fkTables) {
						if (rels[fkTableAlias]) {
							const config = rels[fkTableAlias].config(rels[fkTableAlias].table);
							for (const rel of Object.values(config) as any[]) {
								if (rel.constructor.name === 'One') actualOneCount++;
							}
						}
					}

					expect(actualOneCount).toBe(expectedOneCount);
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 3: Many-relation per inbound FK
	it("Property 3: Many-relation per inbound FK", async () => {
		await fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10 }),
				(fkCount) => {
					_resetRegistry();
					const Parent = Table("parent", (prop) => ({ id: prop.integer().identifier() }));

					for (let i = 0; i < fkCount; i++) {
						Table(`child_${i}`, (prop) => ({
							id: prop.integer().identifier(),
							parent_id: prop.integer().references(() => Parent.id),
						}));
					}

					const rels = getRelations();
					const parentRels = rels.parent.config(rels.parent.table);
					let actualManyCount = 0;
					for (const rel of Object.values(parentRels) as any[]) {
						if (rel.constructor.name === 'Many') actualManyCount++;
					}

					expect(actualManyCount).toBe(fkCount);
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 4: Relation names are valid JS identifiers
	it("Property 4: Relation names are valid JS identifiers", async () => {
		const isValidIdentifier = (name: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

		await fc.assert(
			fc.property(
				fc.array(
					fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z_]+$/.test(s)),
					{ minLength: 2, maxLength: 5 }
				),
				(aliases) => {
					_resetRegistry();
					const uniqueAliases = Array.from(new Set(aliases));
					if (uniqueAliases.length < 2) return true;

					const tables: Record<string, any> = {};
					for (const alias of uniqueAliases) {
						tables[alias] = Table(alias, (prop) => ({ id: prop.integer().identifier() }));
					}

					// Create some random links
					for (let i = 0; i < uniqueAliases.length; i++) {
						const from = uniqueAliases[i];
						const to = uniqueAliases[(i + 1) % uniqueAliases.length];
						Table(`${from}_to_${to}`, (prop) => ({
							ref_id: prop.integer().references(() => tables[to].id)
						}));
					}

					const rels = getRelations();
					for (const tableRels of Object.values(rels) as any[]) {
						const config = tableRels.config(tableRels.table);
						for (const relName of Object.keys(config)) {
							expect(isValidIdentifier(relName)).toBe(true);
						}
					}
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 5: Relation names are unique per table
	it("Property 5: Relation names are unique per table", async () => {
		await fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }),
				(fkCount) => {
					_resetRegistry();
					const Parent = Table("parent", (prop) => ({ id: prop.integer().identifier() }));
					Table("child", (prop) => {
						const fields: any = { id: prop.integer().identifier() };
						for (let i = 0; i < fkCount; i++) {
							fields[`fk_${i}_id`] = prop.integer().references(() => Parent.id);
						}
						return fields;
					});

					const rels = getRelations();
					for (const tableRels of Object.values(rels) as any[]) {
						const config = tableRels.config(tableRels.table);
						const relNames = Object.keys(config);
						const uniqueRelNames = new Set(relNames);
						expect(relNames.length).toBe(uniqueRelNames.size);
					}
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 6: Empty registry produces empty output
	it("Property 6: Empty registry produces empty output", () => {
		_resetRegistry();
		expect(getRelations()).toEqual({});
	});

	// Feature: drizzle-relations-inference, Property 7: Isolated tables are omitted
	it("Property 7: Isolated tables are omitted", async () => {
		await fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)), { minLength: 1, maxLength: 5 }),
				(aliases) => {
					_resetRegistry();
					for (const alias of new Set(aliases)) {
						Table(alias, (prop) => ({ id: prop.integer().identifier() }));
					}
					expect(getRelations()).toEqual({});
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 8: from/to column identity
	it("Property 8: from/to column identity", async () => {
		await fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
				(alias) => {
					if (alias === "parent") return true;
					_resetRegistry();
					const Parent = Table("parent", (prop) => ({ id: prop.integer().identifier() }));
					const Child = Table(alias, (prop) => ({
						parent_id: prop.integer().references(() => Parent.id)
					}));

					const rels = getRelations();

					// Check Child -> Parent (One)
					const childRels = rels[alias].config(Child);
					const oneRel = childRels.parent;
					expect(oneRel).toBeDefined();
					expect(oneRel.config.fields[0]).toBe(Child.parent_id);
					expect(oneRel.config.references[0]).toBe(Parent.id);

					// Check Parent -> Child (Many)
					const parentRels = rels.parent.config(Parent);
					const manyRel = parentRels[alias];
					expect(manyRel).toBeDefined();
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 9: _id suffix stripping
	it("Property 9: _id suffix stripping", async () => {
		await fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
				(baseName) => {
					_resetRegistry();
					const Parent = Table("parent", (prop) => ({ id: prop.integer().identifier() }));
					const fkName = baseName + "_id";
					const Child = Table("child", (prop) => ({
						[fkName]: prop.integer().references(() => Parent.id)
					}));

					const rels = getRelations();
					const childRels = rels.child.config(Child);
					expect(childRels[baseName]).toBeDefined();
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 10: Many-relation name from child alias
	it("Property 10: Many-relation name from child alias", async () => {
		await fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
				(childAlias) => {
					if (childAlias === "parent") return true;
					_resetRegistry();
					const Parent = Table("parent", (prop) => ({ id: prop.integer().identifier() }));
					Table(childAlias, (prop) => ({
						parent_id: prop.integer().references(() => Parent.id)
					}));

					const rels = getRelations();
					const parentRels = rels.parent.config(rels.parent.table);
					expect(parentRels[childAlias]).toBeDefined();
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 11: Cache invalidation on new registration
	it("Property 11: Cache invalidation on new registration", async () => {
		await fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
				(alias) => {
					_resetRegistry();
					const T1 = Table("t1", (prop) => ({ id: prop.integer().identifier() }));
					const T2 = Table("t2", (prop) => ({ t1_id: prop.integer().references(() => T1.id) }));

					const first = getRelations();

					Table(alias + "_extra", (prop) => ({
						id: prop.integer().identifier(),
						t2_id: prop.integer().references(() => T2.t1_id)
					}));

					const second = getRelations();
					expect(first).not.toBe(second);
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});

	// Feature: drizzle-relations-inference, Property 1: Round-trip equivalence
	it("Property 1: Round-trip equivalence", async () => {
		await fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 3 }),
				(_unused) => {
					_resetRegistry();
					const User = Table("users", (prop) => ({ id: prop.integer().identifier() }));
					const Post = Table("posts", (prop) => ({
						id: prop.integer().identifier(),
						author_id: prop.integer().references(() => User.id)
					}));

					const inferred = getRelations();

					const manual = defineRelations({ users: User, posts: Post }, () => ({
						users: relations(User, () => {
							const h = createTableRelationsHelpers(User);
							return {
								posts: h.many(Post)
							};
						}),
						posts: relations(Post, () => {
							const h = createTableRelationsHelpers(Post);
							return {
								author: h.one(User, {
									fields: [Post.author_id],
									references: [User.id]
								})
							};
						})
					}));

					// Compare the structures
					expect(Object.keys(inferred)).toEqual(Object.keys(manual));
					for (const key of Object.keys(manual)) {
						expect(inferred[key].table).toBe(manual[key].table);
						const inferredConfig = inferred[key].config(inferred[key].table);
						const manualConfig = manual[key].config(manual[key].table);
						expect(Object.keys(inferredConfig)).toEqual(Object.keys(manualConfig));
					}
					return true;
				}
			),
			{ numRuns: 100 }
		);
	});
});
