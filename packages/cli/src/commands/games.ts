import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createGamesClient } from "@gpc-cli/api";
import { listLeaderboards, listAchievements, listEvents, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createGamesClient({ auth });
}

export function registerGamesCommands(program: Command): void {
  const games = program
    .command("games")
    .description("Manage Play Games Services — leaderboards, achievements, events");

  games
    .command("leaderboards")
    .description("List leaderboards for the app")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listLeaderboards(client, packageName);
        if (result.length === 0 && format !== "json") {
          console.log("No leaderboards found.");
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  games
    .command("achievements")
    .description("List achievements for the app")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listAchievements(client, packageName);
        if (result.length === 0 && format !== "json") {
          console.log("No achievements found.");
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  games
    .command("events")
    .description("List events for the app")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listEvents(client, packageName);
        if (result.length === 0 && format !== "json") {
          console.log("No events found.");
          return;
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
