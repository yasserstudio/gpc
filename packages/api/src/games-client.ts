import { createHttpClient } from "./http.js";
import type { ApiClientOptions } from "./types.js";

const GAMES_BASE_URL = "https://games.googleapis.com/games/v1";

export interface Leaderboard {
  id: string;
  name: string;
  order: string;
  iconUrl?: string;
}

export interface LeaderboardScore {
  leaderboardId: string;
  scoreValue: string;
  formattedScore: string;
  writeTimestamp?: string;
  tag?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  state: "REVEALED" | "HIDDEN" | "UNLOCKED";
  currentSteps?: number;
  totalSteps?: number;
  experiencePoints?: number;
  formattedCurrentStepsString?: string;
}

export interface GameEvent {
  definitionId: string;
  numEvents: string;
  formattedNumEvents: string;
  kind?: string;
}

export interface GamesApiClient {
  leaderboards: {
    list(packageName: string): Promise<{ items?: Leaderboard[]; nextPageToken?: string }>;
    get(packageName: string, leaderboardId: string): Promise<Leaderboard>;
    getScores(
      packageName: string,
      leaderboardId: string,
      collection: string,
      timeSpan: string,
    ): Promise<{ items?: LeaderboardScore[] }>;
  };
  achievements: {
    list(packageName: string): Promise<{ items?: Achievement[]; nextPageToken?: string }>;
    reveal(packageName: string, achievementId: string): Promise<{ currentState: string }>;
  };
  events: {
    list(packageName: string): Promise<{ items?: GameEvent[]; nextPageToken?: string }>;
  };
}

export function createGamesClient(options: ApiClientOptions): GamesApiClient {
  const http = createHttpClient({ ...options, baseUrl: GAMES_BASE_URL });

  function qs(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
  }

  return {
    leaderboards: {
      async list(packageName) {
        const { data } = await http.get<{ items?: Leaderboard[]; nextPageToken?: string }>(
          `/leaderboards?${qs({ applicationId: packageName })}`,
        );
        return data;
      },
      async get(packageName, leaderboardId) {
        const { data } = await http.get<Leaderboard>(
          `/leaderboards/${encodeURIComponent(leaderboardId)}?${qs({ applicationId: packageName })}`,
        );
        return data;
      },
      async getScores(packageName, leaderboardId, collection, timeSpan) {
        const { data } = await http.get<{ items?: LeaderboardScore[] }>(
          `/leaderboards/${encodeURIComponent(leaderboardId)}/scores/${encodeURIComponent(collection)}?${qs({ timeSpan, applicationId: packageName })}`,
        );
        return data;
      },
    },
    achievements: {
      async list(packageName) {
        const { data } = await http.get<{ items?: Achievement[]; nextPageToken?: string }>(
          `/achievements?${qs({ applicationId: packageName })}`,
        );
        return data;
      },
      async reveal(packageName, achievementId) {
        const { data } = await http.post<{ currentState: string }>(
          `/achievements/${encodeURIComponent(achievementId)}/reveal?${qs({ applicationId: packageName })}`,
          {},
        );
        return data;
      },
    },
    events: {
      async list(packageName) {
        const { data } = await http.get<{ items?: GameEvent[]; nextPageToken?: string }>(
          `/events?${qs({ applicationId: packageName })}`,
        );
        return data;
      },
    },
  };
}
