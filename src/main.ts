#!/usr/bin/env bun
import { $ } from "bun";
import { parseArgs } from "util";

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

async function compile(entrypoint: string, outdir: string) {
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

async function evaluate(path: string) {
	try {
		const absolutePath = Bun.resolveSync(path, process.cwd());
		const module = await import(absolutePath);

		console.info(`Evaluating schema at ${path}:`);
		for (const [key, value] of Object.entries(module)) {
			if (value && typeof value === 'object' && '_name' in value) {
				console.log(`\n--- Export: ${key} ---`);
				console.log(value.toString());
			}
		}
	} catch (error) {
		console.error(`Error evaluating schema: ${error}`);
		process.exit(1);
	}
}

async function generate(schemaPath: string, dialect: string) {
	console.info(`Generating migrations for ${schemaPath} using dialect ${dialect}...`);

	// We need to compile the schema first because drizzle-kit needs a JS/TS file it can evaluate
	// Drizzle-kit often works better with a single compiled file if it's complex.
	// But let's try running it directly on the path first.

	const result = await $`drizzle-kit generate --dialect ${dialect} --schema ${schemaPath}`;

	if (result.exitCode !== 0) {
		console.error("Migration generation failed.");
		console.error(result.stderr.toString());
		process.exit(1);
	}
	console.info("Migration generation successful.");
}

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
