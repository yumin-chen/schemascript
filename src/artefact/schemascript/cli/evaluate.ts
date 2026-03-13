export async function evaluate(path: string) {
	try {
		const absolutePath = Bun.resolveSync(path, process.cwd());
		const module = await import(absolutePath);

		console.info(`Evaluating schema at ${path}:`);
		for (const [key, value] of Object.entries(module)) {
			if (value && typeof value === 'object' && '_name' in value) {
				console.log(`\n--- Export: ${key} ---`);
				// @ts-ignore
				console.log(value.toString());
			}
		}
	} catch (error) {
		console.error(`Error evaluating schema: ${error}`);
		process.exit(1);
	}
}
