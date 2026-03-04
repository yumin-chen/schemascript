import type { SQL } from "@/data/proxies/sqlite";
import * as Primitive from "./primitive";
import type { Property, PropertyBuilder } from "./property";
import { makeBuilder } from "./property";

const integerField = makeBuilder(Primitive.integer.init());
const realField = makeBuilder(Primitive.real.init());
const textField = makeBuilder(Primitive.text.init());
const blobField = makeBuilder(Primitive.blob.init());
const booleanField = makeBuilder(Primitive.boolean.init());
const datetimeField = makeBuilder(Primitive.datetime.init());
const nodeField = makeBuilder(Primitive.node.init());
const enumField = makeBuilder(Primitive.enum.init());

const Field = (): FieldBuilder => ({
	integer: integerField,
	real: realField,
	text: textField,
	blob: blobField,
	boolean: booleanField,
	datetime: datetimeField,
	node: nodeField,
	enum: enumField,
});

const field = Field();

interface FieldBuilder {
	integer: PropertyBuilder<"integer", bigint>;
	real: PropertyBuilder<"real", number>;
	text: PropertyBuilder<"text", string>;
	blob: PropertyBuilder<"blob", Uint8Array>;
	boolean: PropertyBuilder<"boolean", boolean>;
	datetime: PropertyBuilder<"datetime", Date | bigint | string | SQL>;
	node: PropertyBuilder<"node", object>;
	enum: (config: {
		options: string[] | Record<string, number>;
	}) => Property<
		"enum",
		string | number | bigint,
		{ options: string[] | Record<string, number> }
	>;
}

export { field, Field, type FieldBuilder };
