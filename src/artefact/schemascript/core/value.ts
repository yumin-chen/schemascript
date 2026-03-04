import { sql } from "@/data/proxies/sqlite";
import { Constant } from "./_constant" with { type: "macro" };

const macroValue = Constant();

const value = {
	now:
		typeof macroValue.now === "string"
			? macroValue.now
			: sql.raw(macroValue.now.value),
	emptyArray:
		typeof macroValue.emptyArray === "string"
			? macroValue.emptyArray
			: sql.raw(macroValue.emptyArray.value),
};

export { value };
