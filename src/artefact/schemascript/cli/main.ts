import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { compile } from "./compile";
import { evaluate } from "./evaluate";
import { generate } from "./generate";

export async function runCli() {
	const { values, positionals } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			outdir: { type: "string", short: "o" },
			dialect: { type: "string", default: "sqlite" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});

	function showHelp() {
		console.log(`
Usage: schemascript <command> [options] [arguments]

Commands:
  compile <input> [-o <outdir>]      Compile SchemaScript files
  evaluate <input>                   Evaluate SchemaScript files and print metadata
  generate <input> [-o <outdir>]     Generate SQL migrations using drizzle-kit

Options:
  -o, --outdir <dir>  Output directory
  --dialect <dialect> Database dialect (default: sqlite)
  -h, --help          Show this help message
`);
	}

	if (values.help) {
		showHelp();
		process.exit(0);
	}

	if (positionals.length === 0) {
		const defaultPath = "src/data/schemas";
		if (existsSync(defaultPath) || existsSync(`${defaultPath}/index.ts`)) {
			await evaluate(defaultPath);
			process.exit(0);
		}
		showHelp();
		process.exit(0);
	}

	const command = positionals[0];
	const input = positionals[1];

	if (
		!input &&
		(command === "compile" || command === "evaluate" || command === "generate")
	) {
		console.error(`Error: Missing input file for command "${command}"`);
		showHelp();
		process.exit(1);
	}

	switch (command) {
		case "compile":
			await compile(input!, values.outdir ?? "./dist");
			break;
		case "evaluate":
			await evaluate(input!);
			break;
		case "generate":
			await generate(input!, values.dialect as string, values.outdir);
			break;
		default:
			console.error(`Unknown command: ${command}`);
			showHelp();
			process.exit(1);
	}
}
