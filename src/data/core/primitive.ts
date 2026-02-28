import type { SQL } from "../proxies/sqlite";
import { Property } from "./property";

const integer = new Property<"integer", bigint>("integer");
const real = new Property<"real", number>("real");
const text = new Property<"text", string>("text");
const blob = new Property<"blob", Uint8Array>("blob");
const timestamp = new Property<"timestamp", bigint | string | SQL>("timestamp");
const json = new Property<"json", object>("json");
const enumeration = new Property<
	"enum",
	bigint,
	{ options: Record<string, number> }
>("enum");

export { integer, real, text, blob, timestamp, json, enumeration as enum };
