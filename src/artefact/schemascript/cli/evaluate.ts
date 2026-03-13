export async function evaluate(path: string, silentOnError = false) {
	try {
		const absolutePath = Bun.resolveSync(path, process.cwd());
		const module = await import(absolutePath);

		let found = false;
		for (const [key, value] of Object.entries(module)) {
			if (value && typeof value === 'object' && '_name' in value) {
				if (!found) {
					console.info(`Evaluating schema at ${path}:`);
					found = true;
				}
				console.log(`\n--- Export: ${key} ---`);
				// @ts-ignore
				console.log(value.toString());
			}
		}
		return found;
	} catch (error) {
		if (!silentOnError) {
			console.error(`Error evaluating schema: ${error}`);
			process.exit(1);
		}
		return false;
	}
}
