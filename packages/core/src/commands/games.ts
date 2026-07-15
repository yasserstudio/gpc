import type {
  GamesApiClient,
  GamesConfigClient,
  Leaderboard,
  Achievement,
  AchievementConfiguration,
  AchievementConfigurationListResponse,
  LeaderboardConfiguration,
  LeaderboardConfigurationListResponse,
  ImageConfiguration,
} from "@gpc-cli/api";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { GpcError } from "../errors.js";

export type {
  Leaderboard,
  Achievement,
  AchievementConfiguration,
  AchievementConfigurationListResponse,
  LeaderboardConfiguration,
  LeaderboardConfigurationListResponse,
  ImageConfiguration,
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
  const fields = ["achievementType", "initialState", "stepsToUnlock", "draft"];
  for (const field of fields) {
    const localVal = JSON.stringify(
      (localData as unknown as Record<string, unknown>)[field] ?? null,
    );
    const remoteVal = JSON.stringify((remote as unknown as Record<string, unknown>)[field] ?? null);
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
    const remoteVal = JSON.stringify((remote as unknown as Record<string, unknown>)[field] ?? null);
    if (localVal !== remoteVal) {
      diffs.push({ field, local: localVal, remote: remoteVal });
    }
  }
  return diffs;
}

/* ------------------------------------------------------------------ */
/*  Icon upload (Games Configuration image upload)                     */
/* ------------------------------------------------------------------ */

const ICON_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function iconContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const contentType = ICON_CONTENT_TYPES[ext];
  if (!contentType) {
    throw new GpcError(
      `Unsupported icon format: ${ext || "(no extension)"}`,
      "GAMES_INVALID_ICON_FORMAT",
      2,
      "Provide a .png, .jpg, or .jpeg image (Play Games icons are 512x512).",
    );
  }
  return contentType;
}

export async function setAchievementIcon(
  client: GamesConfigClient,
  achievementId: string,
  filePath: string,
): Promise<ImageConfiguration> {
  validateResourceId(achievementId, "achievement");
  return client.images.upload(achievementId, "ACHIEVEMENT_ICON", filePath, iconContentType(filePath));
}

export async function setLeaderboardIcon(
  client: GamesConfigClient,
  leaderboardId: string,
  filePath: string,
): Promise<ImageConfiguration> {
  validateResourceId(leaderboardId, "leaderboard");
  return client.images.upload(leaderboardId, "LEADERBOARD_ICON", filePath, iconContentType(filePath));
}

/* ------------------------------------------------------------------ */
/*  Bulk config sync (push / pull a directory of JSON configs)         */
/* ------------------------------------------------------------------ */

export interface GamesSyncResult {
  created: string[];
  updated: string[];
}

export interface GamesPushOptions {
  dryRun?: boolean;
}

/** Filename-safe form of a Google resource id (ids are alphanumeric tokens). */
function safeConfigFilename(id: string): string {
  return `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

async function readConfigDir<T>(dir: string): Promise<{ file: string; config: T }[]> {
  const entries = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".json"));
  const out: { file: string; config: T }[] = [];
  for (const file of entries) {
    const raw = await readFile(join(dir, file), "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new GpcError(
        `Invalid JSON in ${file}: ${err instanceof Error ? err.message : String(err)}`,
        "GAMES_INVALID_CONFIG_JSON",
        2,
        "Each file in the sync directory must be a valid config JSON.",
      );
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new GpcError(
        `${file} is not a config object.`,
        "GAMES_INVALID_CONFIG_JSON",
        2,
        "Each file must contain a single achievement or leaderboard config object.",
      );
    }
    out.push({ file, config: parsed as T });
  }
  return out;
}

export async function pushAchievementConfigs(
  client: GamesConfigClient,
  applicationId: string,
  dir: string,
  options?: GamesPushOptions,
): Promise<GamesSyncResult> {
  validateApplicationId(applicationId);
  const created: string[] = [];
  const updated: string[] = [];
  for (const { file, config } of await readConfigDir<AchievementConfiguration>(dir)) {
    if (config.id) {
      if (!options?.dryRun) await client.achievements.update(config.id, config);
      updated.push(config.id);
    } else {
      if (options?.dryRun) {
        created.push(file);
      } else {
        const res = await client.achievements.insert(applicationId, config);
        created.push(res.id ?? file);
      }
    }
  }
  return { created, updated };
}

export async function pullAchievementConfigs(
  client: GamesConfigClient,
  applicationId: string,
  dir: string,
): Promise<string[]> {
  validateApplicationId(applicationId);
  await mkdir(dir, { recursive: true });
  const written: string[] = [];
  let pageToken: string | undefined;
  do {
    const result = await client.achievements.list(applicationId, { maxResults: 200, pageToken });
    for (const config of result.items ?? []) {
      const id = config.id ?? "unknown";
      await writeFile(
        join(dir, safeConfigFilename(id)),
        JSON.stringify(config, null, 2) + "\n",
        "utf-8",
      );
      written.push(id);
    }
    pageToken = result.nextPageToken;
  } while (pageToken);
  return written;
}

export async function pushLeaderboardConfigs(
  client: GamesConfigClient,
  applicationId: string,
  dir: string,
  options?: GamesPushOptions,
): Promise<GamesSyncResult> {
  validateApplicationId(applicationId);
  const created: string[] = [];
  const updated: string[] = [];
  for (const { file, config } of await readConfigDir<LeaderboardConfiguration>(dir)) {
    if (config.id) {
      if (!options?.dryRun) await client.leaderboards.update(config.id, config);
      updated.push(config.id);
    } else {
      if (options?.dryRun) {
        created.push(file);
      } else {
        const res = await client.leaderboards.insert(applicationId, config);
        created.push(res.id ?? file);
      }
    }
  }
  return { created, updated };
}

export async function pullLeaderboardConfigs(
  client: GamesConfigClient,
  applicationId: string,
  dir: string,
): Promise<string[]> {
  validateApplicationId(applicationId);
  await mkdir(dir, { recursive: true });
  const written: string[] = [];
  let pageToken: string | undefined;
  do {
    const result = await client.leaderboards.list(applicationId, { maxResults: 200, pageToken });
    for (const config of result.items ?? []) {
      const id = config.id ?? "unknown";
      await writeFile(
        join(dir, safeConfigFilename(id)),
        JSON.stringify(config, null, 2) + "\n",
        "utf-8",
      );
      written.push(id);
    }
    pageToken = result.nextPageToken;
  } while (pageToken);
  return written;
}
