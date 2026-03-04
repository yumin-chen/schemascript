const SqlValue = () => ({
	now: { __type: "sql", value: "CURRENT_TIMESTAMP" } as const,
	emptyArray: { __type: "sql", value: "'[]'" } as const,
});

const sqlValue = SqlValue();

const sqlConstant = () => ({
	now: sqlValue.now,
	emptyArray: sqlValue.emptyArray,
});

const constant = () => ({
	now: "now",
	emptyArray: "[]",
});

// @ts-expect-error
const BUILD_TARGET = process.env.BUILD_TARGET;

const Constant = () => (BUILD_TARGET === "SQLite" ? sqlConstant() : constant());

export { Constant };
