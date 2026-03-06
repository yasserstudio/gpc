import type { Command } from "commander";
import { loadConfig, setConfigValue, getUserConfigPath, initConfig } from "@gpc/config";
import { detectOutputFormat, formatOutput } from "@gpc/core";

export function registerConfigCommands(program: Command): void {
  const config = program
    .command("config")
    .description("Manage configuration");

  config
    .command("init")
    .description("Create a configuration file")
    .option("--global", "Create in user config directory (~/.config/gpc/)")
    .action(async (_options: { global?: boolean }) => {
      const path = await initConfig({});
      console.log(`Configuration file created at: ${path}`);
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
