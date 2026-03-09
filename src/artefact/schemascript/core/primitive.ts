import { Property } from "./property";

type primitive = bigint | number | string | Uint8Array | boolean;

const integer = new Property<"integer", bigint>("integer");

const real = new Property<"real", number>("real");

const text = new Property<"text", string>("text");

const blob = new Property<"blob", Uint8Array>("blob");

const boolean = new Property<"boolean", boolean>("boolean");

export { type primitive, integer, real, text, blob, boolean };
