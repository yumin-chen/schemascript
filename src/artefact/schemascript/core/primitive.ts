import type { SQL } from "@/data/proxies/sqlite";
import { Property } from "./property";

type primitive =
	| bigint
	| number
	| string
	| Uint8Array
	| boolean
	| Date
	| SQL
	| object;

const integer = new Property<"integer", bigint>("integer");

const real = new Property<"real", number>("real");

const text = new Property<"text", string>("text");

const blob = new Property<"blob", Uint8Array>("blob");

const boolean = new Property<"boolean", boolean>("boolean");

const datetime = new Property<"datetime", Date | bigint | string | SQL>(
	"datetime",
);

const node = new Property<"node", object>("node");

const enumeration = new Property<
	"enum",
	string | number | bigint,
	{ options: string[] | Record<string, number> }
>("enum");

export {
	blob,
	boolean,
	datetime,
	enumeration as enum,
	integer,
	node,
	type primitive,
	real,
	text,
};
