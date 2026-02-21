const _$ = (strings: TemplateStringsArray, ...values: unknown[]) =>
	dedent(strings, ...values);

function dedent(strings: TemplateStringsArray, ...values: unknown[]) {
	let result = "";
	for (let i = 0; i < strings.length; i++) {
		result += strings[i];
		if (i < values.length) {
			result += values[i];
		}
	}
	const lines = result.split("\n");

	const trimmedLines = lines.map((line) => line.trimEnd());

	const nonBlankLines = trimmedLines.filter((line) => line.trim().length > 0);
	const minIndent =
		nonBlankLines.length > 0
			? Math.min(
					...nonBlankLines.map((line) => line.match(/^\s*/)?.[0].length || 0),
				)
			: 0;

	const dedented = trimmedLines.map((line) =>
		line.trim().length > 0 ? line.slice(minIndent) : line,
	);

	while (dedented.length > 0 && dedented[0]?.trim().length === 0) {
		dedented.shift();
	}
	while (
		dedented.length > 0 &&
		dedented[dedented.length - 1]?.trim().length === 0
	) {
		dedented.pop();
	}

	return dedented.join("\n");
}

export { _$ };
