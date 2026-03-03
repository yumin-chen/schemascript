import { Property } from "./property";

type primitive = bigint | number | string | Uint8Array;

const integer = new Property<"integer", bigint>("integer");

const real = new Property<"real", number>("real");

const text = new Property<"text", string>("text");

const blob = new Property<"blob", Uint8Array>("blob");

export { type primitive, integer, real, text, blob };
