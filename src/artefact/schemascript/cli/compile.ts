export async function compile(entrypoint: string, outdir: string) {
	console.info(`Compiling ${entrypoint} to ${outdir}...`);
	const result = await Bun.build({
		entrypoints: [entrypoint],
		outdir: outdir,
		target: "node",
		format: "esm",
	});

	if (!result.success) {
		console.error("Compilation failed:");
		for (const message of result.logs) {
			console.error(message);
		}
		process.exit(1);
	}
	console.info("Compilation successful.");
}
