import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  listRecoveryActions,
  cancelRecoveryAction,
  deployRecoveryAction,
  detectOutputFormat,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export function registerRecoveryCommands(program: Command): void {
  const recovery = program.command("recovery").description("Manage app recovery actions");

  recovery
    .command("list")
    .description("List app recovery actions")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listRecoveryActions(client, packageName);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  recovery
    .command("cancel <id>")
    .description("Cancel a recovery action")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "recovery cancel",
            action: "cancel",
            target: id,
          },
          format,
          formatOutput,
        );
        return;
      }

      const confirmed = await requireConfirm(
        `Cancel recovery action ${id}?`,
        program.opts()["yes"],
      );
      if (!confirmed) {
        console.log("Cancelled.");
        return;
      }

      const client = await getClient(config);

      try {
        await cancelRecoveryAction(client, packageName, id);
        console.log(formatOutput({ success: true, appRecoveryId: id, action: "cancelled" }, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  recovery
    .command("deploy <id>")
    .description("Deploy a recovery action")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "recovery deploy",
            action: "deploy",
            target: id,
          },
          format,
          formatOutput,
        );
        return;
      }

      const confirmed = await requireConfirm(
        `Deploy recovery action ${id}?`,
        program.opts()["yes"],
      );
      if (!confirmed) {
        console.log("Cancelled.");
        return;
      }

      const client = await getClient(config);

      try {
        await deployRecoveryAction(client, packageName, id);
        console.log(formatOutput({ success: true, appRecoveryId: id, action: "deployed" }, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
