import { sql } from "@/data/proxies/sqlite";
import { Constant } from "./_constant" with { type: "macro" };

const macroValue = Constant();

const value = {
	now:
		macroValue.now?.__type === "sql"
			? sql.raw(macroValue.now.value)
			: macroValue.now,
	emptyArray:
		macroValue.emptyArray?.__type === "sql"
			? sql.raw(macroValue.emptyArray.value)
			: macroValue.emptyArray,
};

export { value };
