import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import { getAppInfo, updateAppDetails, GpcError } from "@gpc-cli/core";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";

export function registerAppsCommands(program: Command): void {
  const apps = program.command("apps").description("Manage applications");

  apps
    .command("info [package]")
    .description("Show app details")
    .action(async (packageArg?: string) => {
      const config = await loadConfig();
      const packageName = packageArg || config.app;

      if (!packageName) {
        throw new GpcError(
          "No package name provided. Usage: gpc apps info <package>",
          "MISSING_PACKAGE",
          2,
          "gpc config set app com.example.app",
        );
      }

      const auth = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
      });
      const client = createApiClient({ auth });
      const info = await getAppInfo(client, packageName);
      const format = getOutputFormat(program, config);
      console.log(formatOutput(info, format));
    });

  apps
    .command("update")
    .description("Update app details")
    .option("--email <email>", "Contact email")
    .option("--phone <phone>", "Contact phone")
    .option("--website <url>", "Contact website")
    .option("--default-lang <lang>", "Default language")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = options["app"] || program.opts()["app"] || config.app;

      if (!packageName) {
        throw new GpcError(
          "No package name provided. Usage: gpc apps update --email user@example.com",
          "MISSING_PACKAGE",
          2,
          "gpc config set app com.example.app",
        );
      }

      const data: Record<string, string> = {};
      if (options["email"]) data["contactEmail"] = options["email"];
      if (options["phone"]) data["contactPhone"] = options["phone"];
      if (options["website"]) data["contactWebsite"] = options["website"];
      if (options["defaultLang"]) data["defaultLanguage"] = options["defaultLang"];

      if (Object.keys(data).length === 0) {
        throw new GpcError(
          "Provide at least one field to update (--email, --phone, --website, --default-lang).",
          "MISSING_OPTION",
          2,
        );
      }

      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "apps update",
            action: "update app details for",
            target: packageName,
            details: data,
          },
          format,
          formatOutput,
        );
        return;
      }

      const auth = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
      });
      const client = createApiClient({ auth });
      const result = await updateAppDetails(client, packageName, data);
      console.log(formatOutput(result, format));
    });

  apps
    .command("list")
    .description("List configured applications")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (_options) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

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
