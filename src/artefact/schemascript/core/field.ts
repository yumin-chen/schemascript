import type { SQL } from "@/data/proxies/sqlite";
import * as Primitive from "./primitive";
import type { Property, PropertyBuilder } from "./property";

const integerField = () => Primitive.integer.init();
const realField = () => Primitive.real.init();
const textField = () => Primitive.text.init();
const blobField = () => Primitive.blob.init();
const booleanField = () => Primitive.boolean.init();
const datetimeField = () => Primitive.datetime.init();
const nodeField = () => Primitive.node.init();
function enumField(config: { options: string[] | Record<string, number> }) {
	return Primitive.enum.init().enumOptions(config);
}

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
