import type { SQL } from "../proxies/sqlite";
import * as Primitive from "./primitive";
import type { PropertyBuilder } from "./property";

const integerField = (name: string, config?: unknown) =>
	Primitive.integer.metadata(name, config);
const realField = (name: string, config?: unknown) =>
	Primitive.real.metadata(name, config);
const textField = (name: string, config?: unknown) =>
	Primitive.text.metadata(name, config);
const blobField = (name: string, config?: unknown) =>
	Primitive.blob.metadata(name, config);
const enumField = (
	name: string,
	config?: { options: Record<string, number> },
) => Primitive.enum.metadata(name, config);

const Field = (): FieldBuilder => ({
	integer: integerField,
	real: realField,
	text: textField,
	blob: blobField,
	enum: enumField,
});

const field = Field();

interface FieldBuilder {
	integer: PropertyBuilder<"integer", bigint | string | SQL>;
	real: PropertyBuilder<"real", number>;
	text: PropertyBuilder<"text", string>;
	blob: PropertyBuilder<"blob", Uint8Array>;
	enum: PropertyBuilder<"enum", bigint, { options: Record<string, number> }>;
}

export { field, Field, type FieldBuilder };
