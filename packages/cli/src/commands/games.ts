import { resolvePackageName } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createGamesClient } from "@gpc-cli/api";
import { listLeaderboards, listAchievements, listEvents, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

async function getGamesClient(config: { auth?: { serviceAccount?: string } }) {
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
      const client = await getGamesClient(config);
      const format = getOutputFormat(program, config);

      const result = await listLeaderboards(client, packageName);
      if (result.length === 0 && format !== "json") {
        console.log("No leaderboards found.");
        return;
      }
      console.log(formatOutput(result, format));
    });

  games
    .command("achievements")
    .description("List achievements for the app")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getGamesClient(config);
      const format = getOutputFormat(program, config);

      const result = await listAchievements(client, packageName);
      if (result.length === 0 && format !== "json") {
        console.log("No achievements found.");
        return;
      }
      console.log(formatOutput(result, format));
    });

  games
    .command("events")
    .description("List events for the app")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getGamesClient(config);
      const format = getOutputFormat(program, config);

      const result = await listEvents(client, packageName);
      if (result.length === 0 && format !== "json") {
        console.log("No events found.");
        return;
      }
      console.log(formatOutput(result, format));
    });
}
