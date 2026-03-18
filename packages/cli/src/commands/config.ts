import type { Command } from "commander";
import { loadConfig, setConfigValue, getUserConfigPath, initConfig } from "@gpc-cli/config";
import type { GpcConfig } from "@gpc-cli/config";
import { formatOutput, writeAuditLog, createAuditEntry } from "@gpc-cli/core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getOutputFormat } from "../format.js";
import { isInteractive, promptInput, promptSelect, promptConfirm } from "../prompt.js";

const ANDROID_PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function registerConfigCommands(program: Command): void {
  const config = program.command("config").description("Manage configuration");

  config
    .command("init")
    .description("Create a configuration file")
    .option("--global", "Create in user config directory (~/.config/gpc/)")
    .action(async (_options: { global?: boolean }) => {
      const initialConfig: Record<string, unknown> = {};

      if (isInteractive(program)) {
        console.log("\nGPC Setup Wizard\n");

        // Package name
        let app = await promptInput("Default package name (e.g. com.example.app, blank to skip)");
        if (app) {
          if (!ANDROID_PACKAGE_RE.test(app)) {
            console.error(
              `  Warning: "${app}" doesn't look like a valid Android package name — continuing anyway`,
            );
          }
          initialConfig["app"] = app;
        }

        // Auth method
        const authMethod = await promptSelect(
          "Authentication method:",
          ["service-account", "adc", "skip"],
          "service-account",
        );

        if (authMethod === "service-account") {
          let saPath = "";
          while (true) {
            saPath = await promptInput("Path to service account JSON key file");
            if (!saPath) {
              console.log("  Skipping service account setup.");
              break;
            }
            const resolved = resolve(saPath);
            if (existsSync(resolved)) {
              initialConfig["auth"] = { serviceAccount: saPath };
              break;
            }
            console.error(`  File not found: ${resolved}`);
            const retry = await promptConfirm("Try a different path?");
            if (!retry) break;
          }
        } else if (authMethod === "adc") {
          console.log(
            "  Using Application Default Credentials — run `gcloud auth application-default login` if not already set up.",
          );
        }

        // Output format
        const output = await promptSelect(
          "Default output format:",
          ["table", "json", "yaml", "markdown"],
          "table",
        );
        if (output !== "table") initialConfig["output"] = output;
      }

      const path = await initConfig(initialConfig as GpcConfig);

      // Summary
      const configured: string[] = [];
      if (initialConfig["app"]) configured.push(`app: ${initialConfig["app"]}`);
      if (initialConfig["auth"]) configured.push("auth: service account");
      if (initialConfig["output"]) configured.push(`output: ${initialConfig["output"]}`);

      console.log(`\nConfiguration file created: ${path}`);
      if (configured.length > 0) {
        console.log(`  ${configured.join("  ·  ")}`);
      }

      writeAuditLog(createAuditEntry("config init", { path })).catch(() => {});

      // Run doctor inline to verify setup
      console.log("\nVerifying setup...");
      try {
        const { registerDoctorCommand } = await import("./doctor.js");
        const { Command } = await import("commander");
        const doctorProgram = new Command();
        doctorProgram
          .option("-o, --output <format>", "Output format")
          .option("-j, --json", "JSON mode");
        registerDoctorCommand(doctorProgram);
        await doctorProgram.parseAsync(["node", "gpc", "doctor"]);
      } catch {
        // Doctor failures should not prevent config init from succeeding
        console.log("Run `gpc doctor` to verify your setup.");
      }
    });

  config
    .command("show")
    .description("Display resolved configuration")
    .action(async () => {
      const resolved = await loadConfig();
      const format = getOutputFormat(program, resolved);
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
