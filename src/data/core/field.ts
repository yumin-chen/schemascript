import * as Primitive from "./primitive";
import type { PropertyBuilder } from "./property";

const field = (): FieldBuilder => ({
	integer: integerField,
	real: realField,
	text: textField,
	blob: blobField,
	enum: enumField,
});

const integerField = (name: string, config?: unknown) =>
	Primitive.integer.setMetadata(name, config);
const realField = (name: string, config?: unknown) =>
	Primitive.real.setMetadata(name, config);
const textField = (name: string, config?: unknown) =>
	Primitive.text.setMetadata(name, config);
const blobField = (name: string, config?: unknown) =>
	Primitive.blob.setMetadata(name, config);
const enumField = (name: string, config?: unknown) =>
	Primitive.enum.setMetadata(name, config);

interface FieldBuilder {
	integer: PropertyBuilder<"integer", bigint>;
	real: PropertyBuilder<"real", number>;
	text: PropertyBuilder<"text", string>;
	blob: PropertyBuilder<"blob", Uint8Array>;
	enum: PropertyBuilder<"enum", Array<string>>;
}

export { field, type FieldBuilder };
