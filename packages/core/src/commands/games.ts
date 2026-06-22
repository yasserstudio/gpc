import type {
  GamesApiClient,
  GamesConfigClient,
  Leaderboard,
  Achievement,
  AchievementConfiguration,
  AchievementConfigurationListResponse,
  LeaderboardConfiguration,
  LeaderboardConfigurationListResponse,
} from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export type {
  Leaderboard,
  Achievement,
  AchievementConfiguration,
  AchievementConfigurationListResponse,
  LeaderboardConfiguration,
  LeaderboardConfigurationListResponse,
};

/* ------------------------------------------------------------------ */
/*  Player API (Games v1) — read-only, kept for runtime inspection     */
/* ------------------------------------------------------------------ */

export async function listLeaderboards(
  client: GamesApiClient,
  packageName: string,
): Promise<Leaderboard[]> {
  const result = await client.leaderboards.list(packageName);
  return result.items ?? [];
}

export async function listAchievements(
  client: GamesApiClient,
  packageName: string,
): Promise<Achievement[]> {
  const result = await client.achievements.list(packageName);
  return result.items ?? [];
}

/* ------------------------------------------------------------------ */
/*  Configuration API — CRUD on achievement/leaderboard definitions    */
/* ------------------------------------------------------------------ */

export interface ListGamesConfigOptions {
  maxResults?: number;
  pageToken?: string;
}

export interface GameConfigDiff {
  field: string;
  local: string;
  remote: string;
}

function validateApplicationId(applicationId: string): void {
  if (!applicationId || !applicationId.trim()) {
    throw new GpcError(
      "Application ID is required.",
      "GAMES_INVALID_APPLICATION_ID",
      2,
      "Pass --game-id or set games.applicationId in .gpcrc.json. Find it in Play Console > Play Games Services > Setup.",
    );
  }
}

function validateResourceId(id: string, label: string): void {
  if (!id || !id.trim()) {
    throw new GpcError(
      `${label} ID is required.`,
      `GAMES_INVALID_${label.toUpperCase().replace(/ /g, "_")}_ID`,
      2,
      `Find the ${label} ID in Play Console > Play Games Services, or via gpc games ${label.includes("achievement") ? "achievements" : "leaderboards"} list.`,
    );
  }
}

/* ---------- Achievement Configurations ---------- */

export async function listAchievementConfigs(
  client: GamesConfigClient,
  applicationId: string,
  options?: ListGamesConfigOptions,
): Promise<AchievementConfigurationListResponse> {
  validateApplicationId(applicationId);
  return client.achievements.list(applicationId, options);
}

export async function getAchievementConfig(
  client: GamesConfigClient,
  achievementId: string,
): Promise<AchievementConfiguration> {
  validateResourceId(achievementId, "achievement");
  return client.achievements.get(achievementId);
}

export async function createAchievementConfig(
  client: GamesConfigClient,
  applicationId: string,
  data: AchievementConfiguration,
): Promise<AchievementConfiguration> {
  validateApplicationId(applicationId);
  return client.achievements.insert(applicationId, data);
}

export async function updateAchievementConfig(
  client: GamesConfigClient,
  achievementId: string,
  data: AchievementConfiguration,
): Promise<AchievementConfiguration> {
  validateResourceId(achievementId, "achievement");
  return client.achievements.update(achievementId, data);
}

export async function deleteAchievementConfig(
  client: GamesConfigClient,
  achievementId: string,
): Promise<void> {
  validateResourceId(achievementId, "achievement");
  return client.achievements.delete(achievementId);
}

export async function diffAchievementConfig(
  client: GamesConfigClient,
  achievementId: string,
  localData: AchievementConfiguration,
): Promise<GameConfigDiff[]> {
  validateResourceId(achievementId, "achievement");
  const remote = await client.achievements.get(achievementId);
  const diffs: GameConfigDiff[] = [];
  const fields = [
    "achievementType",
    "initialState",
    "stepsToUnlock",
    "draft",
  ];
  for (const field of fields) {
    const localVal = JSON.stringify(
      (localData as unknown as Record<string, unknown>)[field] ?? null,
    );
    const remoteVal = JSON.stringify(
      (remote as unknown as Record<string, unknown>)[field] ?? null,
    );
    if (localVal !== remoteVal) {
      diffs.push({ field, local: localVal, remote: remoteVal });
    }
  }
  return diffs;
}

/* ---------- Leaderboard Configurations ---------- */

export async function listLeaderboardConfigs(
  client: GamesConfigClient,
  applicationId: string,
  options?: ListGamesConfigOptions,
): Promise<LeaderboardConfigurationListResponse> {
  validateApplicationId(applicationId);
  return client.leaderboards.list(applicationId, options);
}

export async function getLeaderboardConfig(
  client: GamesConfigClient,
  leaderboardId: string,
): Promise<LeaderboardConfiguration> {
  validateResourceId(leaderboardId, "leaderboard");
  return client.leaderboards.get(leaderboardId);
}

export async function createLeaderboardConfig(
  client: GamesConfigClient,
  applicationId: string,
  data: LeaderboardConfiguration,
): Promise<LeaderboardConfiguration> {
  validateApplicationId(applicationId);
  return client.leaderboards.insert(applicationId, data);
}

export async function updateLeaderboardConfig(
  client: GamesConfigClient,
  leaderboardId: string,
  data: LeaderboardConfiguration,
): Promise<LeaderboardConfiguration> {
  validateResourceId(leaderboardId, "leaderboard");
  return client.leaderboards.update(leaderboardId, data);
}

export async function deleteLeaderboardConfig(
  client: GamesConfigClient,
  leaderboardId: string,
): Promise<void> {
  validateResourceId(leaderboardId, "leaderboard");
  return client.leaderboards.delete(leaderboardId);
}

export async function diffLeaderboardConfig(
  client: GamesConfigClient,
  leaderboardId: string,
  localData: LeaderboardConfiguration,
): Promise<GameConfigDiff[]> {
  validateResourceId(leaderboardId, "leaderboard");
  const remote = await client.leaderboards.get(leaderboardId);
  const diffs: GameConfigDiff[] = [];
  const fields = ["scoreOrder", "scoreMin", "scoreMax", "draft"];
  for (const field of fields) {
    const localVal = JSON.stringify(
      (localData as unknown as Record<string, unknown>)[field] ?? null,
    );
    const remoteVal = JSON.stringify(
      (remote as unknown as Record<string, unknown>)[field] ?? null,
    );
    if (localVal !== remoteVal) {
      diffs.push({ field, local: localVal, remote: remoteVal });
    }
  }
  return diffs;
}
