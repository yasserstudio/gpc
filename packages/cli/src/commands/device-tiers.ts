import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import { listDeviceTiers, getDeviceTier, createDeviceTier, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { readFile } from "node:fs/promises";



export function registerDeviceTiersCommands(program: Command): void {
  const dt = program.command("device-tiers").description("Manage device tier configurations");

  dt.command("list")
    .description("List device tier configurations")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listDeviceTiers(client, packageName);
      const configs = (result as unknown as Record<string, unknown>)["deviceTierConfigs"] as
        | Record<string, unknown>[]
        | undefined;
      if (format !== "json" && (!configs || configs.length === 0)) {
        console.log("No device tier configs found.");
        return;
      }
      if (format !== "json" && configs) {
        const rows = configs.map((c) => ({
          deviceTierConfigId: c["deviceTierConfigId"] || "-",
          deviceGroups: Array.isArray(c["deviceGroups"])
            ? (c["deviceGroups"] as unknown[]).length
            : 0,
          deviceTierSet: c["deviceTierSet"] ? "yes" : "no",
        }));
        console.log(formatOutput(rows, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  dt.command("get <config-id>")
    .description("Get a device tier configuration")
    .action(async (configId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getDeviceTier(client, packageName, configId);
      console.log(formatOutput(result, format));
    });

  dt.command("create")
    .description("Create a device tier configuration from a JSON file")
    .requiredOption("--file <path>", "Path to JSON config file")
    .action(async (opts: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "device-tiers create",
            action: "create device tier config from",
            target: opts.file,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const raw = await readFile(opts.file, "utf-8");
      const tierConfig = JSON.parse(raw);
      const result = await createDeviceTier(client, packageName, tierConfig);
      console.log(formatOutput(result, format));
    });
}
