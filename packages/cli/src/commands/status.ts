import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import { getReleasesStatus } from "@gpc-cli/core";
import { detectOutputFormat, formatOutput } from "@gpc-cli/core";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Cross-track release overview")
    .action(async () => {
      const config = await loadConfig();
      const packageName = program.opts()['app'] || config.app;
      if (!packageName) {
        console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
        process.exit(2);
      }

      try {
        const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
        const client = createApiClient({ auth });
        const statuses = await getReleasesStatus(client, packageName);
        const format = detectOutputFormat();
        console.log(formatOutput(statuses, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
