import type { SchemaBuilder } from "../core";
import { field, Schema, Table, value } from "../core";

const commit: SchemaBuilder = () => ({
	/**
	 * The message.
	 *
	 * @name message
	 * @description The full path including filename of the commit.
	 * @type TEXT
	 * @unique
	 */
	message: field.text("message").unique(),

	/**
	 * The mode type of the commit.
	 *
	 * @name mode
	 * @description The mode type of the commit.
	 * @type Enum
	 */
	mode: field.enum("mode", {
		options: {
			blob: 100644,
			executable: 100755,
			symlink: 120000,
			directory: 40000,
			submodule: 160000,
		},
	}),

	/**
	 * The cryptographic hash digest of the commit content.
	 *
	 * @name digest
	 * @description The cryptographic hash digest of the commit content.
	 * @type TEXT
	 * @unique
	 * @identifier
	 */
	digest: field.text("digest").unique().identifier(),

	/**
	 * The cryptographic hash digest identifier of the commit parents.
	 *
	 * @name digest
	 * @description The cryptographic hash digest of the commit parents.
	 * @type TEXT.Array
	 */
	parents: field.text("parents").array(),

	/**
	 * The author actino of the commit.
	 *
	 * @name author
	 * @description The author action of the commit.
	 * @type TEXT.JSON
	 * @derived
	 */
	author: field.text("author", { mode: "json" }).deriveFrom({
		schemas: [action],
		joinOn: (o, u) => `${o}.digest = ${u}.commit_digest`,
		sql: (o, u) => `${u}`,
	}),

	/**
	 * The committer action.
	 *
	 * @name committer
	 * @description The committer action.
	 * @type TEXT.JSON
	 * @derived
	 */
	committer: field.text("committer", { mode: "json" }).deriveFrom({
		schemas: [action],
		joinOn: (o, u) => `${o}.digest = ${u}.commit_digest`,
		sql: (o, u) => `${u}`,
	}),

	/**
	 * The content of the commit.
	 *
	 * @name artefacts
	 * @description The content of the commit.
	 * @type TEXT.Array
	 * @array
	 */
	artefacts: field
		.text("artefacts", { mode: "timestamp" })
		.deriveFrom({
			schemas: [artefact],
			joinOn: (o, u) => `${o}.digest = ${u}.digest`,
			sql: (o, u) => `${u}.author.date`,
		})
		.array()
		.default(value.emptyArray),
});

const commitSchema = Schema("Commit", commit);
const commitTable = Table("commits", commit);

export { commitSchema, commitTable };
