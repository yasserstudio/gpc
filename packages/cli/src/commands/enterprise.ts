import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createEnterpriseClient } from "@gpc-cli/api";
import { listEnterpriseApps, createEnterpriseApp, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";

async function getClient() {
  const config = await loadConfig();
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return { client: createEnterpriseClient({ auth }), config };
}

export function registerEnterpriseCommands(program: Command): void {
  const enterprise = program
    .command("enterprise")
    .description("Manage private enterprise apps via Managed Google Play")
    .requiredOption("--org <id>", "Google Play organization ID");

  enterprise
    .command("list")
    .description("List private enterprise apps")
    .action(async () => {
      const { client, config } = await getClient();
      const orgId = enterprise.opts()["org"] as string;
      const format = getOutputFormat(program, config);

      try {
        const result = await listEnterpriseApps(client, orgId);
        if (result.length === 0 && format !== "json") {
          console.log("No enterprise apps found.");
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  enterprise
    .command("create")
    .description("Create a new private enterprise app")
    .requiredOption("--title <title>", "App title")
    .option("--lang <code>", "Language code (default: en_US)", "en_US")
    .action(async (options) => {
      const { client, config } = await getClient();
      const orgId = enterprise.opts()["org"] as string;
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          { command: "enterprise create", action: "create enterprise app", target: options.title as string },
          format,
          formatOutput,
        );
        return;
      }

      try {
        const result = await createEnterpriseApp(client, orgId, {
          title: options.title as string,
          languageCode: options.lang as string,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
