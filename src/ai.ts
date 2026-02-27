/**
 * AI Utilities for the Artefact Runtime.
 */

declare const __host_categorise_call: (
	content: string,
	choices: string[],
) => string;
declare const __host_predict_call: (content: string, schema: string) => string;

/**
 * Categorise input text into one of the provided choices.
 * This is a high-level API built on top of the host's categorise capability.
 *
 * @param content The input text to categorise.
 * @param choices An array of strings representing the possible categories.
 * @returns The category that best matches the input.
 */
export async function categorise(
	content: string,
	choices: string[],
): Promise<string> {
	const response = __host_categorise_call(content, choices);
	return response;
}

/**
 * Predict structured output for a given prompt.
 * This is a low-level completion API for structured JSON.
 *
 * @param content The input prompt or data.
 * @param schema A JSON schema or description guiding the output structure.
 * @returns A JSON-formatted string (or object if parsed by the caller).
 */
export async function predict(
	content: string,
	schema: string | object,
): Promise<string> {
	const schemaStr =
		typeof schema === "string" ? schema : JSON.stringify(schema);
	const response = __host_predict_call(content, schemaStr);
	return response;
}
