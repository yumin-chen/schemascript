import type { SchemaBuilder } from "@artefacto/schemascript";
import { Schema, Table } from "@artefacto/schemascript";
import { UserTable } from "./user";

const Post: SchemaBuilder = (prop) => ({
	id: prop.integer().identifier(),
	author_id: prop
		.integer()
		.references(() => UserTable.id, { onDelete: "cascade" }),
	title: prop.text(),
});

const PostSchema = Schema("Post", Post);
const PostTable = Table("posts", Post);

export { Post, PostSchema, PostTable };

