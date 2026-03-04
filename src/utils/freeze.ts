/**
 * Recursively freezes an object or array.
 * @param obj The object to freeze.
 * @returns The frozen object.
 */
export function deepFreeze<T>(obj: T): T {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	const propNames = Object.getOwnPropertyNames(obj);

	for (const name of propNames) {
		const value = (obj as any)[name];
		if (value && typeof value === "object") {
			deepFreeze(value);
		}
	}

	return Object.freeze(obj);
}
