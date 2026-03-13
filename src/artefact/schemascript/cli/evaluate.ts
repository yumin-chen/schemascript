import { resolve } from "node:path";

export async function evaluate(entrypoint: string) {
	const absolutePath = resolve(entrypoint);
	const module = await import(absolutePath);

	let found = false;
	for (const [key, value] of Object.entries(module)) {
		if (
			value &&
			typeof value === "object" &&
			"_name" in value &&
			"fields" in value
		) {
			found = true;
			console.log(`--- Schema: ${key} ---`);
			if (typeof (value as any).toString === "function") {
				console.log((value as any).toString());
			}
			if (typeof (value as any).toTypeScriptInterface === "function") {
				console.log("\nTypeScript Interface:");
				console.log((value as any).toTypeScriptInterface());
			}
			console.log("\nJSON Metadata:");
			console.log(JSON.stringify(value, null, 2));
			console.log("\n");
		}
	}

	if (!found) {
		console.warn(
			"No SchemaScript schemas found in the exported members of the module.",
		);
	}
}
