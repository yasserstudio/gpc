import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createUsersClient } from "@gpc-cli/api";
import { listGrants, createGrant, updateGrant, deleteGrant, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";

function resolveDeveloperId(devIdArg: string | undefined, config: GpcConfig): string {
  const id = devIdArg || config.developerId;
  if (!id) {
    console.error("Error: No developer ID. Use --developer-id <id> or gpc config set developerId <id>");
    process.exit(2);
  }
  return id;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createUsersClient({ auth });
}

export function registerGrantsCommands(program: Command): void {
  const grants = program
    .command("grants")
    .description("Manage per-app permission grants for developer account users")
    .option("--developer-id <id>", "Developer account ID");

  grants
    .command("list <email>")
    .description("List all per-app grants for a user")
    .action(async (email: string) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(grants.opts()["developerId"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listGrants(client, developerId, email);
        if (result.length === 0) {
          if (format === "json") {
            console.log(formatOutput([], format));
          } else {
            console.log(`No grants found for ${email}.`);
          }
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  grants
    .command("create <email>")
    .description("Grant app-level permissions to a user")
    .requiredOption("--package <packageName>", "App package name")
    .requiredOption("--permissions <list>", "Comma-separated permissions (e.g. CAN_MANAGE_RELEASES,VIEW_APP_INFORMATION)")
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(grants.opts()["developerId"], config);
      const format = getOutputFormat(program, config);
      const perms = (options.permissions as string).split(",").map((p: string) => p.trim());

      if (isDryRun(program)) {
        printDryRun(
          { command: "grants create", action: "grant permissions", target: `${email}/${options.package}`, details: { permissions: perms } },
          format, formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await createGrant(client, developerId, email, options.package, perms);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  grants
    .command("update <email>")
    .description("Update app-level permissions for a user")
    .requiredOption("--package <packageName>", "App package name")
    .requiredOption("--permissions <list>", "New comma-separated permissions")
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(grants.opts()["developerId"], config);
      const format = getOutputFormat(program, config);
      const perms = (options.permissions as string).split(",").map((p: string) => p.trim());

      if (isDryRun(program)) {
        printDryRun(
          { command: "grants update", action: "update permissions", target: `${email}/${options.package}`, details: { permissions: perms } },
          format, formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await updateGrant(client, developerId, email, options.package, perms);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  grants
    .command("delete <email>")
    .description("Remove a per-app grant from a user")
    .requiredOption("--package <packageName>", "App package name")
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(grants.opts()["developerId"], config);
      const format = getOutputFormat(program, config);

      await requireConfirm(`Remove grant for "${email}" on ${options.package}?`, program);

      if (isDryRun(program)) {
        printDryRun(
          { command: "grants delete", action: "remove grant", target: `${email}/${options.package}` },
          format, formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        await deleteGrant(client, developerId, email, options.package);
        console.log(`Grant removed for ${email} on ${options.package}.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
