import * as Primitive from "./primitive";
import type { PropertyBuilder } from "./property";

const integerField = () => Primitive.integer.init();
const realField = () => Primitive.real.init();
const textField = () => Primitive.text.init();
const blobField = () => Primitive.blob.init();

const Field = (): FieldBuilder => ({
	integer: integerField,
	real: realField,
	text: textField,
	blob: blobField,
});

const field = Field();

interface FieldBuilder {
	integer: PropertyBuilder<"integer", bigint>;
	real: PropertyBuilder<"real", number>;
	text: PropertyBuilder<"text", string>;
	blob: PropertyBuilder<"blob", Uint8Array>;
}

export { field, Field, type FieldBuilder };
