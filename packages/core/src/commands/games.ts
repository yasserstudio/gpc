import type { GamesApiClient, Leaderboard, Achievement, GameEvent } from "@gpc-cli/api";

export { Leaderboard, Achievement, GameEvent };

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

export async function listEvents(
  client: GamesApiClient,
  packageName: string,
): Promise<GameEvent[]> {
  const result = await client.events.list(packageName);
  return result.items ?? [];
}
