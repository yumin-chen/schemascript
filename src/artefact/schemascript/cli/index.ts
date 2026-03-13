import { parseArgs } from "util";
import { compile } from "./compile";
import { evaluate } from "./evaluate";
import { generate } from "./generate";

export async function run() {
	const { values, positionals } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			help: {
				type: "boolean",
				short: "h",
			},
			version: {
				type: "boolean",
				short: "v",
			},
			outdir: {
				type: "string",
				short: "o",
				default: "./dist",
			},
			dialect: {
				type: "string",
				short: "d",
				default: "sqlite",
			},
		},
		allowPositionals: true,
	});

	const helpMessage = `
Usage: schemascript [command] [options]

Commands:
  compile <path>    Compile a schema file or directory.
  evaluate <path>   Evaluate a schema file and print its structure.
  generate <path>   Generate SQL migrations using drizzle-kit.

Options:
  -h, --help        Show this help message.
  -v, --version     Show version information.
  -o, --outdir      Output directory for compile (default: ./dist).
  -d, --dialect     Database dialect for generate (default: sqlite).
`;

	if (values.help) {
		console.log(helpMessage);
		process.exit(0);
	}

	if (values.version) {
		// @ts-ignore
		const version = typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : "development";
		console.log(`schemascript version ${version}`);
		process.exit(0);
	}

	const command = positionals[0];
	const path = positionals[1];

	switch (command) {
		case "compile":
			if (!path) {
				console.error("Error: compile requires a path.");
				process.exit(1);
			}
			await compile(path, values.outdir as string);
			break;
		case "evaluate":
			if (!path) {
				console.error("Error: evaluate requires a path.");
				process.exit(1);
			}
			await evaluate(path);
			break;
		case "generate":
			if (!path) {
				console.error("Error: generate requires a path.");
				process.exit(1);
			}
			await generate(path, values.dialect as string);
			break;
		default:
			if (command) {
				console.error(`Unknown command: ${command}`);
			}
			console.log(helpMessage);
			process.exit(command ? 1 : 0);
	}
}
