/**
 * Removes the leading whitespace common to all lines in a template string.
 *
 * @param strings - The array of string fragments from the template string.
 * @param values - The values of the interpolated expressions in the template string.
 * @returns The processed string with common indentation and surrounding blank lines removed.
 * ```
 */
function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
	const rawString = strings.reduce(
		(acc, str, i) => acc + str + (values[i] ?? ""),
		"",
	);

	const lines = rawString.split("\n");

	const trimmedLines = lines.map((line) => line.trimRight());

	const nonEmptyLines = trimmedLines.filter((line) => line.trim().length > 0);

	const minIndentation =
		nonEmptyLines.length > 0
			? Math.min(
					...nonEmptyLines.map((line) => line.match(/^\s*/)?.[0].length ?? 0),
				)
			: 0;

	const dedentedLines = trimmedLines.map((line) =>
		line.trim().length > 0 ? line.slice(minIndentation) : line,
	);

	let start = 0;
	let end = dedentedLines.length;

	while (start < end && dedentedLines[start]!.trim().length === 0) {
		start++;
	}
	while (end > start && dedentedLines[end - 1]!.trim().length === 0) {
		end--;
	}

	return dedentedLines.slice(start, end).join("\n");
}

/**
 * Tagged template function to remove indentation from template strings.
 * This is an exported alias for the {@link dedent} function.
 *
 * @param strings - The array of string fragments from the template string.
 * @param values - The values of the interpolated expressions in the template string.
 * @returns The processed string.
 */
export const _$ = (strings: TemplateStringsArray, ...values: unknown[]) =>
	dedent(strings, ...values);
