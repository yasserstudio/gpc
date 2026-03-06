import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerDocsCommand } from "./commands/docs.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("gpc")
    .description("The complete Google Play CLI")
    .version("0.0.0", "-V, --version")
    .option("-o, --output <format>", "Output format: table, json, yaml, markdown")
    .option("-v, --verbose", "Enable debug logging")
    .option("-q, --quiet", "Suppress non-essential output")
    .option("-a, --app <package>", "App package name")
    .option("-p, --profile <name>", "Auth profile name")
    .option("--no-color", "Disable colored output")
    .option("--no-interactive", "Disable interactive prompts");

  registerAuthCommands(program);
  registerConfigCommands(program);
  registerDoctorCommand(program);
  registerDocsCommand(program);

  return program;
}
