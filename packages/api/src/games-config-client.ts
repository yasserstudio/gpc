import { createHttpClient } from "./http.js";
import type { ApiClientOptions } from "./types.js";

const GAMES_CONFIG_BASE_URL =
  "https://gamesconfiguration.googleapis.com/games/v1configuration";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LocalizedString {
  locale: string;
  value: string;
}

export interface LocalizedStringBundle {
  translations?: LocalizedString[];
}

export interface AchievementConfigurationDetail {
  kind?: string;
  name: LocalizedStringBundle;
  description: LocalizedStringBundle;
  pointValue: number;
  iconUrl?: string;
  sortRank?: number;
}

export interface AchievementConfiguration {
  kind?: string;
  token?: string;
  id?: string;
  achievementType: "STANDARD" | "INCREMENTAL";
  initialState: "HIDDEN" | "REVEALED";
  stepsToUnlock?: number;
  draft: AchievementConfigurationDetail;
  published?: AchievementConfigurationDetail;
}

export interface AchievementConfigurationListResponse {
  kind?: string;
  items?: AchievementConfiguration[];
  nextPageToken?: string;
}

export interface GamesNumberAffixConfiguration {
  zero?: LocalizedStringBundle;
  one?: LocalizedStringBundle;
  two?: LocalizedStringBundle;
  few?: LocalizedStringBundle;
  many?: LocalizedStringBundle;
  other?: LocalizedStringBundle;
}

export interface GamesNumberFormatConfiguration {
  numberFormatType: "NUMERIC" | "TIME_DURATION" | "CURRENCY";
  numDecimalPlaces?: number;
  currencyCode?: string;
  suffix?: GamesNumberAffixConfiguration;
}

export interface LeaderboardConfigurationDetail {
  kind?: string;
  name: LocalizedStringBundle;
  iconUrl?: string;
  sortRank?: number;
  scoreFormat: GamesNumberFormatConfiguration;
}

export interface LeaderboardConfiguration {
  kind?: string;
  token?: string;
  id?: string;
  scoreOrder: "LARGER_IS_BETTER" | "SMALLER_IS_BETTER";
  scoreMin?: string;
  scoreMax?: string;
  draft: LeaderboardConfigurationDetail;
  published?: LeaderboardConfigurationDetail;
}

export interface LeaderboardConfigurationListResponse {
  kind?: string;
  items?: LeaderboardConfiguration[];
  nextPageToken?: string;
}

/* ------------------------------------------------------------------ */
/*  Client interface                                                   */
/* ------------------------------------------------------------------ */

export interface GamesConfigClient {
  achievements: {
    list(
      applicationId: string,
      options?: { maxResults?: number; pageToken?: string },
    ): Promise<AchievementConfigurationListResponse>;
    get(achievementId: string): Promise<AchievementConfiguration>;
    insert(
      applicationId: string,
      data: AchievementConfiguration,
    ): Promise<AchievementConfiguration>;
    update(
      achievementId: string,
      data: AchievementConfiguration,
    ): Promise<AchievementConfiguration>;
    delete(achievementId: string): Promise<void>;
  };
  leaderboards: {
    list(
      applicationId: string,
      options?: { maxResults?: number; pageToken?: string },
    ): Promise<LeaderboardConfigurationListResponse>;
    get(leaderboardId: string): Promise<LeaderboardConfiguration>;
    insert(
      applicationId: string,
      data: LeaderboardConfiguration,
    ): Promise<LeaderboardConfiguration>;
    update(
      leaderboardId: string,
      data: LeaderboardConfiguration,
    ): Promise<LeaderboardConfiguration>;
    delete(leaderboardId: string): Promise<void>;
  };
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

const p = (segment: string): string => encodeURIComponent(segment);

export function createGamesConfigClient(
  options: ApiClientOptions,
): GamesConfigClient {
  const http = createHttpClient({ ...options, baseUrl: GAMES_CONFIG_BASE_URL });

  return {
    achievements: {
      async list(applicationId, options) {
        const params = new URLSearchParams();
        if (options?.maxResults != null) params.set("maxResults", String(options.maxResults));
        if (options?.pageToken) params.set("pageToken", options.pageToken);
        const qs = params.toString();
        const path = `/applications/${p(applicationId)}/achievements${qs ? `?${qs}` : ""}`;
        const { data } = await http.get<AchievementConfigurationListResponse>(path);
        return data;
      },

      async get(achievementId) {
        const { data } = await http.get<AchievementConfiguration>(
          `/achievements/${p(achievementId)}`,
        );
        return data;
      },

      async insert(applicationId, data) {
        const { data: result } = await http.post<AchievementConfiguration>(
          `/applications/${p(applicationId)}/achievements`,
          data,
        );
        return result;
      },

      async update(achievementId, data) {
        const { data: result } = await http.put<AchievementConfiguration>(
          `/achievements/${p(achievementId)}`,
          data,
        );
        return result;
      },

      async delete(achievementId) {
        await http.delete(`/achievements/${p(achievementId)}`);
      },
    },

    leaderboards: {
      async list(applicationId, options) {
        const params = new URLSearchParams();
        if (options?.maxResults != null) params.set("maxResults", String(options.maxResults));
        if (options?.pageToken) params.set("pageToken", options.pageToken);
        const qs = params.toString();
        const path = `/applications/${p(applicationId)}/leaderboards${qs ? `?${qs}` : ""}`;
        const { data } = await http.get<LeaderboardConfigurationListResponse>(path);
        return data;
      },

      async get(leaderboardId) {
        const { data } = await http.get<LeaderboardConfiguration>(
          `/leaderboards/${p(leaderboardId)}`,
        );
        return data;
      },

      async insert(applicationId, data) {
        const { data: result } = await http.post<LeaderboardConfiguration>(
          `/applications/${p(applicationId)}/leaderboards`,
          data,
        );
        return result;
      },

      async update(leaderboardId, data) {
        const { data: result } = await http.put<LeaderboardConfiguration>(
          `/leaderboards/${p(leaderboardId)}`,
          data,
        );
        return result;
      },

      async delete(leaderboardId) {
        await http.delete(`/leaderboards/${p(leaderboardId)}`);
      },
    },
  };
}
