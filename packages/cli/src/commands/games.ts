import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import type { ResolvedConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import {
  createGamesClient,
  createGamesConfigClient,
  type AchievementConfiguration,
  type LeaderboardConfiguration,
} from "@gpc-cli/api";
import {
  listLeaderboards,
  listAchievements,
  listAchievementConfigs,
  getAchievementConfig,
  createAchievementConfig,
  updateAchievementConfig,
  deleteAchievementConfig,
  diffAchievementConfig,
  listLeaderboardConfigs,
  getLeaderboardConfig,
  createLeaderboardConfig,
  updateLeaderboardConfig,
  deleteLeaderboardConfig,
  diffLeaderboardConfig,
  setAchievementIcon,
  setLeaderboardIcon,
  pushAchievementConfigs,
  pullAchievementConfigs,
  pushLeaderboardConfigs,
  pullLeaderboardConfigs,
  formatOutput,
  annotateListResult,
  moreResultsFooter,
  GpcError,
} from "@gpc-cli/core";
import { resolvePackageName } from "../resolve.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";
import { requireConfirm } from "../prompt.js";
import { readJsonFile } from "../json.js";

function resolveGameId(flag: string | undefined, config: ResolvedConfig): string {
  const gameId = flag ?? process.env["GPC_GAME_ID"] ?? config.games?.applicationId;
  if (!gameId) {
    throw new GpcError(
      "Game application ID is required. Pass --game-id, set GPC_GAME_ID, or add games.applicationId to .gpcrc.json.",
      "GAMES_NO_APPLICATION_ID",
      2,
      "Find your numeric application ID in Play Console > Play Games Services > Setup.",
    );
  }
  return gameId;
}

async function getGamesClient(config: { auth?: { serviceAccount?: string } }) {
  const auth = await resolveAuth({
    serviceAccountPath: config.auth?.serviceAccount,
  });
  return createGamesClient({ auth });
}

async function getGamesConfigClientFromConfig(config: { auth?: { serviceAccount?: string } }) {
  const auth = await resolveAuth({
    serviceAccountPath: config.auth?.serviceAccount,
  });
  return createGamesConfigClient({ auth });
}

function printSyncResult(
  kind: string,
  result: { created: string[]; updated: string[] },
  dryRun: boolean,
  format: string,
): void {
  if (format === "json") {
    console.log(formatOutput({ created: result.created, updated: result.updated, dryRun }, format));
  } else {
    console.log(
      `${dryRun ? "[dry-run] " : ""}${kind}s: created ${result.created.length}, updated ${result.updated.length}.`,
    );
  }
}

function printPullResult(kind: string, written: string[], dir: string, format: string): void {
  if (format === "json") {
    console.log(formatOutput({ written, count: written.length, dir }, format));
  } else {
    console.log(`Wrote ${written.length} ${kind} config(s) to ${dir}.`);
  }
}

export function registerGamesCommands(program: Command): void {
  const games = program
    .command("games")
    .description("Manage Play Games Services — achievements, leaderboards (configuration API)")
    .option("--game-id <id>", "Games application ID (numeric)");

  /* ---------------------------------------------------------------- */
  /*  Achievements                                                     */
  /* ---------------------------------------------------------------- */

  const achievements = games
    .command("achievements")
    .description("Manage achievement configurations");

  achievements
    .command("list")
    .description("List achievement configurations")
    .option("--limit <n>", "Maximum results per page", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .action(async (options) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const result = await listAchievementConfigs(client, gameId, {
        maxResults: options.limit,
        pageToken: options.nextPage,
      });
      const items = result.items ?? [];
      if (format !== "json") {
        if (items.length === 0) {
          console.log("No achievement configurations found.");
        } else {
          console.log(formatOutput(items, format));
          const footer = moreResultsFooter(result.nextPageToken);
          if (footer) console.log(footer);
        }
      } else {
        console.log(
          formatOutput(
            annotateListResult(
              { achievements: items, nextPageToken: result.nextPageToken },
              "achievements",
              "No achievement configurations found",
            ),
            format,
          ),
        );
      }
    });

  achievements
    .command("get <achievement-id>")
    .description("Get an achievement configuration")
    .action(async (achievementId: string) => {
      const config = await loadConfig();
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const result = await getAchievementConfig(client, achievementId);
      console.log(formatOutput(result, format));
    });

  achievements
    .command("create")
    .description("Create an achievement from a JSON file")
    .requiredOption("--file <path>", "JSON file with achievement data")
    .action(async (options) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games achievements create",
            action: "create",
            target: `achievement from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getGamesConfigClientFromConfig(config);
      const data = await readJsonFile(options.file);
      const result = await createAchievementConfig(
        client,
        gameId,
        data as AchievementConfiguration,
      );
      console.log(formatOutput(result, format));
    });

  achievements
    .command("update <achievement-id>")
    .description("Update an achievement from a JSON file")
    .requiredOption("--file <path>", "JSON file with achievement data")
    .action(async (achievementId: string, options) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games achievements update",
            action: "update",
            target: achievementId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getGamesConfigClientFromConfig(config);
      const data = await readJsonFile(options.file);
      const result = await updateAchievementConfig(
        client,
        achievementId,
        data as AchievementConfiguration,
      );
      console.log(formatOutput(result, format));
    });

  achievements
    .command("delete <achievement-id>")
    .description("Delete an achievement")
    .action(async (achievementId: string) => {
      const config = await loadConfig();

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "games achievements delete",
            action: "delete",
            target: achievementId,
          },
          format,
          formatOutput,
        );
        return;
      }

      await requireConfirm(
        `Delete achievement "${achievementId}"? This cannot be undone.`,
        program,
      );

      const client = await getGamesConfigClientFromConfig(config);
      await deleteAchievementConfig(client, achievementId);
      console.log(`Achievement ${achievementId} deleted.`);
    });

  achievements
    .command("diff <achievement-id>")
    .description("Compare local JSON against remote achievement configuration")
    .requiredOption("--file <path>", "JSON file with local achievement data")
    .action(async (achievementId: string, options) => {
      const config = await loadConfig();
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const localData = await readJsonFile(options.file);
      const diffs = await diffAchievementConfig(
        client,
        achievementId,
        localData as AchievementConfiguration,
      );
      if (diffs.length === 0) {
        console.log("No differences found.");
      } else {
        console.log(formatOutput(diffs, format));
      }
    });

  achievements
    .command("set-icon <achievement-id> <file>")
    .description("Upload an achievement icon (png/jpg, 512x512)")
    .action(async (achievementId: string, file: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games achievements set-icon",
            action: "upload",
            target: achievementId,
            details: { file },
          },
          format,
          formatOutput,
        );
        return;
      }
      const client = await getGamesConfigClientFromConfig(config);
      const result = await setAchievementIcon(client, achievementId, file);
      console.log(formatOutput(result, format));
    });

  achievements
    .command("push <dir>")
    .description("Create or update achievement configs from a directory of JSON files")
    .action(async (dir: string) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);
      const dryRun = isDryRun(program);
      const client = await getGamesConfigClientFromConfig(config);
      const result = await pushAchievementConfigs(client, gameId, dir, { dryRun });
      printSyncResult("achievement", result, dryRun, format);
    });

  achievements
    .command("pull <dir>")
    .description("Write all achievement configs to a directory as JSON files")
    .action(async (dir: string) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);
      const client = await getGamesConfigClientFromConfig(config);
      const written = await pullAchievementConfigs(client, gameId, dir);
      printPullResult("achievement", written, dir, format);
    });

  /* ---------------------------------------------------------------- */
  /*  Leaderboards                                                     */
  /* ---------------------------------------------------------------- */

  const leaderboards = games
    .command("leaderboards")
    .description("Manage leaderboard configurations");

  leaderboards
    .command("list")
    .description("List leaderboard configurations")
    .option("--limit <n>", "Maximum results per page", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .action(async (options) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const result = await listLeaderboardConfigs(client, gameId, {
        maxResults: options.limit,
        pageToken: options.nextPage,
      });
      const items = result.items ?? [];
      if (format !== "json") {
        if (items.length === 0) {
          console.log("No leaderboard configurations found.");
        } else {
          console.log(formatOutput(items, format));
          const footer = moreResultsFooter(result.nextPageToken);
          if (footer) console.log(footer);
        }
      } else {
        console.log(
          formatOutput(
            annotateListResult(
              { leaderboards: items, nextPageToken: result.nextPageToken },
              "leaderboards",
              "No leaderboard configurations found",
            ),
            format,
          ),
        );
      }
    });

  leaderboards
    .command("get <leaderboard-id>")
    .description("Get a leaderboard configuration")
    .action(async (leaderboardId: string) => {
      const config = await loadConfig();
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const result = await getLeaderboardConfig(client, leaderboardId);
      console.log(formatOutput(result, format));
    });

  leaderboards
    .command("create")
    .description("Create a leaderboard from a JSON file")
    .requiredOption("--file <path>", "JSON file with leaderboard data")
    .action(async (options) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games leaderboards create",
            action: "create",
            target: `leaderboard from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getGamesConfigClientFromConfig(config);
      const data = await readJsonFile(options.file);
      const result = await createLeaderboardConfig(
        client,
        gameId,
        data as LeaderboardConfiguration,
      );
      console.log(formatOutput(result, format));
    });

  leaderboards
    .command("update <leaderboard-id>")
    .description("Update a leaderboard from a JSON file")
    .requiredOption("--file <path>", "JSON file with leaderboard data")
    .action(async (leaderboardId: string, options) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games leaderboards update",
            action: "update",
            target: leaderboardId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getGamesConfigClientFromConfig(config);
      const data = await readJsonFile(options.file);
      const result = await updateLeaderboardConfig(
        client,
        leaderboardId,
        data as LeaderboardConfiguration,
      );
      console.log(formatOutput(result, format));
    });

  leaderboards
    .command("delete <leaderboard-id>")
    .description("Delete a leaderboard")
    .action(async (leaderboardId: string) => {
      const config = await loadConfig();

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "games leaderboards delete",
            action: "delete",
            target: leaderboardId,
          },
          format,
          formatOutput,
        );
        return;
      }

      await requireConfirm(
        `Delete leaderboard "${leaderboardId}"? This cannot be undone.`,
        program,
      );

      const client = await getGamesConfigClientFromConfig(config);
      await deleteLeaderboardConfig(client, leaderboardId);
      console.log(`Leaderboard ${leaderboardId} deleted.`);
    });

  leaderboards
    .command("diff <leaderboard-id>")
    .description("Compare local JSON against remote leaderboard configuration")
    .requiredOption("--file <path>", "JSON file with local leaderboard data")
    .action(async (leaderboardId: string, options) => {
      const config = await loadConfig();
      const client = await getGamesConfigClientFromConfig(config);
      const format = getOutputFormat(program, config);

      const localData = await readJsonFile(options.file);
      const diffs = await diffLeaderboardConfig(
        client,
        leaderboardId,
        localData as LeaderboardConfiguration,
      );
      if (diffs.length === 0) {
        console.log("No differences found.");
      } else {
        console.log(formatOutput(diffs, format));
      }
    });

  leaderboards
    .command("set-icon <leaderboard-id> <file>")
    .description("Upload a leaderboard icon (png/jpg, 512x512)")
    .action(async (leaderboardId: string, file: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      if (isDryRun(program)) {
        printDryRun(
          {
            command: "games leaderboards set-icon",
            action: "upload",
            target: leaderboardId,
            details: { file },
          },
          format,
          formatOutput,
        );
        return;
      }
      const client = await getGamesConfigClientFromConfig(config);
      const result = await setLeaderboardIcon(client, leaderboardId, file);
      console.log(formatOutput(result, format));
    });

  leaderboards
    .command("push <dir>")
    .description("Create or update leaderboard configs from a directory of JSON files")
    .action(async (dir: string) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);
      const dryRun = isDryRun(program);
      const client = await getGamesConfigClientFromConfig(config);
      const result = await pushLeaderboardConfigs(client, gameId, dir, { dryRun });
      printSyncResult("leaderboard", result, dryRun, format);
    });

  leaderboards
    .command("pull <dir>")
    .description("Write all leaderboard configs to a directory as JSON files")
    .action(async (dir: string) => {
      const config = await loadConfig();
      const gameId = resolveGameId(games.opts()["gameId"], config);
      const format = getOutputFormat(program, config);
      const client = await getGamesConfigClientFromConfig(config);
      const written = await pullLeaderboardConfigs(client, gameId, dir);
      printPullResult("leaderboard", written, dir, format);
    });

  /* ---------------------------------------------------------------- */
  /*  Runtime (Games v1) — read-only inspection                        */
  /* ---------------------------------------------------------------- */

  const runtime = games
    .command("runtime")
    .description("Inspect runtime player data (Games v1 API, read-only)");

  runtime
    .command("leaderboards")
    .description("List runtime leaderboard data")
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

  runtime
    .command("achievements")
    .description("List runtime achievement data")
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
}
