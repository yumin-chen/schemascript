import type { SQL } from "@/data/proxies/sqlite";
import * as Primitive from "./primitive";
import type { PropertyBuilder } from "./property";

const integerField = () => Primitive.integer.init();
const realField = () => Primitive.real.init();
const textField = () => Primitive.text.init();
const blobField = () => Primitive.blob.init();
const booleanField = () => Primitive.boolean.init();
const datetimeField = () => Primitive.datetime.init();
const nodeField = () => Primitive.node.init();

const Field = (): FieldBuilder => ({
	integer: integerField,
	real: realField,
	text: textField,
	blob: blobField,
	boolean: booleanField,
	datetime: datetimeField,
	node: nodeField,
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
}

export { field, Field, type FieldBuilder };
