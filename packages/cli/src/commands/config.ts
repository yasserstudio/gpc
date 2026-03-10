import type { Command } from "commander";
import { loadConfig, setConfigValue, getUserConfigPath, initConfig } from "@gpc-cli/config";
import type { GpcConfig } from "@gpc-cli/config";
import { detectOutputFormat, formatOutput, writeAuditLog, createAuditEntry } from "@gpc-cli/core";
import { isInteractive, promptInput, promptSelect } from "../prompt.js";

export function registerConfigCommands(program: Command): void {
  const config = program.command("config").description("Manage configuration");

  config
    .command("init")
    .description("Create a configuration file")
    .option("--global", "Create in user config directory (~/.config/gpc/)")
    .action(async (_options: { global?: boolean }) => {
      const initialConfig: Record<string, unknown> = {};

      if (isInteractive(program)) {
        const app = await promptInput("Default package name (e.g. com.example.app, blank to skip)");
        if (app) initialConfig["app"] = app;

        const output = await promptSelect(
          "Default output format:",
          ["table", "json", "yaml", "markdown"],
          "table",
        );
        if (output !== "table") initialConfig["output"] = output;

        const sa = await promptInput("Service account JSON path (blank to skip)");
        if (sa) initialConfig["auth"] = { serviceAccount: sa };
      }

      const path = await initConfig(initialConfig as GpcConfig);
      console.log(`Configuration file created at: ${path}`);
      writeAuditLog(createAuditEntry("config init", { path })).catch(() => {});
    });

  config
    .command("show")
    .description("Display resolved configuration")
    .action(async () => {
      const resolved = await loadConfig();
      const format = detectOutputFormat();
      console.log(formatOutput(resolved, format));
    });

  config
    .command("set <key> <value>")
    .description("Set a configuration value")
    .action(async (key: string, value: string) => {
      await setConfigValue(key, value);
      console.log(`Set ${key} = ${value}`);
    });

  config
    .command("path")
    .description("Show configuration file path")
    .action(() => {
      console.log(getUserConfigPath());
    });
}
