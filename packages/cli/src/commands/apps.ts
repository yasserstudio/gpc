import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import { getAppInfo } from "@gpc/core";
import { detectOutputFormat, formatOutput } from "@gpc/core";

export function registerAppsCommands(program: Command): void {
  const apps = program
    .command("apps")
    .description("Manage applications");

  apps
    .command("info [package]")
    .description("Show app details")
    .action(async (packageArg?: string) => {
      const config = await loadConfig();
      const packageName = packageArg || config.app;

      if (!packageName) {
        console.error("Error: No package name provided.");
        console.error("Usage: gpc apps info <package>");
        console.error("Or set a default: gpc config set app com.example.app");
        process.exit(2);
      }

      try {
        const auth = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        const client = createApiClient({ auth });
        const info = await getAppInfo(client, packageName);
        const format = detectOutputFormat();
        console.log(formatOutput(info, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  apps
    .command("list")
    .description("List configured applications")
    .action(async () => {
      const config = await loadConfig();
      const format = detectOutputFormat();

      if (config.app) {
        const apps = [{ packageName: config.app, source: "config" }];
        console.log(formatOutput(apps, format));
      } else {
        console.log("No apps configured.");
        console.log("");
        console.log("Set a default app:");
        console.log("  gpc config set app com.example.myapp");
        console.log("");
        console.log("Or use the --app flag:");
        console.log("  gpc apps info --app com.example.myapp");
      }
    });
}
