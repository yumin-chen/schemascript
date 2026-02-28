import type { SchemaBuilder } from "../core";
import { field, Schema, Table, value } from "../core";

const action: SchemaBuilder = () => ({
	/**
	 * The actor identifier.
	 *
	 * @name actor
	 * @description The actor identifier.
	 * @type TEXT
	 */
	actor: field.text("actor"),

	/**
	 * The timestamp of the action.
	 *
	 * @name timestamp
	 * @description The timestamp of the action.
	 * @type Integer.Timestamp
	 */
	timestamp: field
		.integer("timestamp", { mode: "timestamp" })
		.default(value.now),
});

const actionSchema = Schema("Action", action);
const actionTable = Table("actions", action);

export { actionSchema, actionTable };
