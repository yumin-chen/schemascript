import type { SchemaBuilder } from "@artefacto/schemascript";
import { Schema, Table, value } from "@artefacto/schemascript";

const User: SchemaBuilder = (prop) => ({
	id: prop.integer().identifier(),
	username: prop.text().unique(),
	email: prop.text().optional(),
	created_at: prop.datetime().default(value.now),
});
const UserSchema = Schema("User", User);
const UserTable = Table("users", User);

export { User, UserSchema, UserTable };
