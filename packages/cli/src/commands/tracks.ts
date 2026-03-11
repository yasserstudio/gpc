import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import { listTracks } from "@gpc-cli/core";
import { detectOutputFormat, formatOutput } from "@gpc-cli/core";

export function registerTracksCommands(program: Command): void {
  const tracks = program.command("tracks").description("Manage tracks");

  tracks
    .command("list")
    .description("List all tracks")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = program.opts()["app"] || config.app;
      if (!packageName) {
        console.error(
          "Error: No package name. Use --app <package> or gpc config set app <package>",
        );
        process.exit(2);
      }

      try {
        const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
        const client = createApiClient({ auth });
        const trackList = await listTracks(client, packageName);
        const format = detectOutputFormat();

        const summary = trackList.map((t) => ({
          track: t.track,
          releases: t.releases?.length || 0,
          latestStatus: t.releases?.[0]?.status || "none",
          latestVersion: t.releases?.[0]?.versionCodes?.[0] || "-",
        }));

        console.log(formatOutput(summary, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
