import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import {
  listTesters,
  addTesters,
  removeTesters,
  importTestersFromCsv,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";

function resolvePackageName(packageArg: string | undefined, config: any): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: any) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export function registerTestersCommands(program: Command): void {
  const testers = program
    .command("testers")
    .description("Manage testers and tester groups");

  testers
    .command("list")
    .description("List testers for a track")
    .requiredOption("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listTesters(client, packageName, options.track);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  testers
    .command("add <emails...>")
    .description("Add testers (Google Group emails) to a track")
    .requiredOption("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .action(async (emails: string[], options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await addTesters(client, packageName, options.track, emails);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  testers
    .command("remove <emails...>")
    .description("Remove testers (Google Group emails) from a track")
    .requiredOption("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .action(async (emails: string[], options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await removeTesters(client, packageName, options.track, emails);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  testers
    .command("import")
    .description("Import testers from a CSV file")
    .requiredOption("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .requiredOption("--file <path>", "CSV file with email addresses")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await importTestersFromCsv(client, packageName, options.track, options.file);
        console.log(formatOutput({ added: result.added, testers: result.testers }, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
