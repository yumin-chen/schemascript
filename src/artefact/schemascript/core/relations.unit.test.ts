import { describe, expect, it, beforeEach } from "bun:test";
import { Table } from "./table";
import { _resetRegistry, getRelations } from "./registry";

describe("SchemaRegistry and Relations Inference (Unit)", () => {
	beforeEach(() => {
		_resetRegistry();
	});

	it("Requirement 1.3: empty registry returns empty result without throwing", () => {
		const relations = getRelations();
		expect(relations).toEqual({});
	});

	it("Requirement 2.1, 2.2, 2.3, 3.1, 3.2, 3.3: single FK produces correct one and many relations", () => {
		const User = Table("users", (prop) => ({
			id: prop.integer().identifier(),
			name: prop.text(),
		}));

		const Post = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop.integer().references(() => User.id),
		}));

		const rels = getRelations();

		expect(rels.users).toBeDefined();
		expect(rels.users.table).toBe(User);

		expect(rels.posts).toBeDefined();
		expect(rels.posts.table).toBe(Post);

		const postRels = rels.posts.config(rels.posts.table);
		expect(postRels.author).toBeDefined();

		const userRels = rels.users.config(rels.users.table);
		expect(userRels.posts).toBeDefined();
	});

	it("Requirement 4.1: author_id column name strips _id -> relation named author; column named id stays id", () => {
		const User = Table("users", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const Post = Table("posts", (prop) => ({
			id: prop.integer().identifier().references(() => User.id), // id references id
			author_id: prop.integer().references(() => User.id), // author_id references id
		}));

		const rels = getRelations();
		const postRels = rels.posts.config(rels.posts.table);
		expect(postRels.author).toBeDefined();
		expect(postRels.id).toBeDefined();
	});

	it("Requirement 4.2: many-relation name equals child table alias", () => {
		const User = Table("users", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const Post = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop.integer().references(() => User.id),
		}));

		const rels = getRelations();
		const userRels = rels.users.config(rels.users.table);
		expect(userRels.posts).toBeDefined();
	});

	it("Requirement 1.4: isolated table (no FK, not referenced) is absent from output", () => {
		Table("users", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const rels = getRelations();
		expect(rels.users).toBeUndefined();
	});

	it("Requirement 2.5, 3.5, 4.3: two FKs on same table to same parent produce distinct relation names", () => {
		const User = Table("users", (prop) => ({
			id: prop.integer().identifier(),
		}));

		const Post = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop.integer().references(() => User.id),
			reviewer_id: prop.integer().references(() => User.id),
		}));

		const rels = getRelations();

		const postRels = rels.posts.config(rels.posts.table);
		expect(postRels.author).toBeDefined();
		expect(postRels.reviewer).toBeDefined();

		const userRels = rels.users.config(rels.users.table);
		// Check the relation names in User table
		const userRelNames = Object.keys(userRels);
		// First one gets base name, second one gets suffix
		expect(userRelNames).toContain("posts");
		expect(userRelNames).toContain("posts_reviewer_id");
	});

	it("Requirement 5.3: ref thunk resolving to unregistered column throws descriptive error", () => {
		const UnregisteredTable = {
			id: {
				_ : {
					name: "id",
					table: {
						_ : {
							name: "unregistered"
						}
					}
				}
			}
		};

		Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			other_id: prop.integer().references(() => UnregisteredTable.id as any),
		}));

		expect(() => getRelations()).toThrow(/Foreign key on 'posts.other_id' references a column that is not part of any registered table/);
	});

	it("Requirement 7.3: getRelations() returns same object reference on second call (cache hit)", () => {
		const User = Table("users", (prop) => ({ id: prop.integer().identifier() }));
		const Post = Table("posts", (prop) => ({ author_id: prop.integer().references(() => User.id) }));

		const first = getRelations();
		const second = getRelations();
		expect(first).toBe(second);
	});

	it("Requirement 7.4: registering a new table after getRelations() was called invalidates cache", () => {
		const User = Table("users", (prop) => ({ id: prop.integer().identifier() }));
		const Post = Table("posts", (prop) => ({
			id: prop.integer().identifier(),
			author_id: prop.integer().references(() => User.id)
		}));

		const first = getRelations();

		Table("comments", (prop) => ({
			id: prop.integer().identifier(),
			post_id: prop.integer().references(() => Post.id),
		}));

		const second = getRelations();
		expect(first).not.toBe(second);
		expect(second.comments).toBeDefined();
	});
});
