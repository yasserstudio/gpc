import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";

import {
  listRecoveryActions,
  cancelRecoveryAction,
  deployRecoveryAction,
  createRecoveryAction,
  addRecoveryTargeting,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";
import { requireConfirm } from "../prompt.js";
import { readFileSync } from "node:fs";



export function registerRecoveryCommands(program: Command): void {
  const recovery = program.command("recovery").description("Manage app recovery actions");

  recovery
    .command("list")
    .description("List app recovery actions")
    .option("--version-code <code>", "Filter by version code", parseInt)
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        if (options.versionCode === undefined) {
          console.error(
            "Error: --version-code is required. The API requires a version code to filter recovery actions.",
          );
          console.error("Usage: gpc recovery list --version-code <code>");
          process.exit(2);
        }
        const result = await listRecoveryActions(client, packageName, options.versionCode);
        if (Array.isArray(result) && result.length === 0) {
          if (format === "json") {
            console.log(formatOutput([], format));
          } else {
            console.log("No recovery actions found.");
          }
          return;
        }
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
      const format = getOutputFormat(program, config);

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

      await requireConfirm(`Cancel recovery action ${id}?`, program);

      const client = await getClient(config);

      try {
        await cancelRecoveryAction(client, packageName, id);
        console.log(
          formatOutput({ success: true, appRecoveryId: id, action: "cancelled" }, format),
        );
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
      const format = getOutputFormat(program, config);

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

      await requireConfirm(`Deploy recovery action ${id}?`, program);

      const client = await getClient(config);

      try {
        await deployRecoveryAction(client, packageName, id);
        console.log(formatOutput({ success: true, appRecoveryId: id, action: "deployed" }, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  recovery
    .command("create")
    .description("Create a new app recovery action")
    .requiredOption("--file <path>", "Path to JSON file with recovery action data")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFileSync(options.file, "utf-8"));
      } catch (err) {
        console.error(
          `Error: Could not read recovery action data from ${options.file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "recovery create",
            action: "create recovery action",
            target: packageName,
            details: data,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await createRecoveryAction(client, packageName, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  recovery
    .command("add-targeting <action-id>")
    .description("Add targeting rules to an existing recovery action")
    .requiredOption("--file <path>", "Path to JSON file with targeting data")
    .action(async (actionId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      let targeting: Record<string, unknown>;
      try {
        targeting = JSON.parse(readFileSync(options.file, "utf-8"));
      } catch (err) {
        console.error(
          `Error: Could not read targeting data from ${options.file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "recovery add-targeting",
            action: "add targeting to recovery action",
            target: actionId,
            details: targeting,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await addRecoveryTargeting(client, packageName, actionId, targeting);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
