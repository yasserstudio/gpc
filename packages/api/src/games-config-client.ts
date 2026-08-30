import { PlayApiError } from "./errors.js";
import { createHttpClient } from "./http.js";
import type { ApiClientOptions } from "./types.js";

const GAMES_CONFIG_BASE_URL = "https://gamesconfiguration.googleapis.com/games/v1configuration";

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

export type GamesImageType = "ACHIEVEMENT_ICON" | "LEADERBOARD_ICON";

export interface ImageConfiguration {
  kind?: string;
  resourceId?: string;
  imageType?: string;
  url?: string;
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
  images: {
    /** Upload an achievement or leaderboard icon (media upload). */
    upload(
      resourceId: string,
      imageType: GamesImageType,
      filePath: string,
      contentType: string,
    ): Promise<ImageConfiguration>;
  };
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

const p = (segment: string): string => encodeURIComponent(segment);

/**
 * Google removed the `imageConfigurations` resource from the published
 * gamesconfiguration discovery document (revision 20260820); only
 * achievementConfigurations and leaderboardConfigurations remain. The upload
 * route may still be served, so we leave the call in place and only translate
 * its failure — but only when the failure says the ROUTE is gone.
 *
 * A bare 404 is not enough: the same status covers "no such achievement id",
 * and replacing Google's explanation with our own is exactly the misdiagnosis
 * that cost a reporter five hours in GH #101. So we match the route-not-found
 * signature only: Google's HTML 404 page, or a JSON error saying the URL or
 * method itself was not found. "Requested entity was not found" stays untouched.
 */
const RETIRED_ROUTE_PATTERNS = [
  // Google's HTML 404 page, before and after tag stripping.
  "<html",
  "error 404 (not found)!!1",
  "the requested url",
  "was not found on this server",
  // JSON route/method-level 404s.
  "method not found",
  "unknown path",
];

function isRetiredEndpointError(err: unknown): err is PlayApiError {
  if (!(err instanceof PlayApiError)) return false;
  if (err.statusCode === undefined || err.statusCode < 300) return false;
  const message = err.message.toLowerCase();
  return RETIRED_ROUTE_PATTERNS.some((pattern) => message.includes(pattern));
}

function retiredImageEndpointError(cause: PlayApiError): PlayApiError {
  return new PlayApiError(
    `Google removed the Play Games icon upload endpoint (imageConfigurations) from the Games Configuration API. Google Play said: ${cause.message}`,
    "API_ENDPOINT_RETIRED",
    cause.statusCode,
    "Upload achievement and leaderboard icons in the Play Console (Grow > Play Games Services > Setup and management > Achievements / Leaderboards)",
  );
}

export function createGamesConfigClient(options: ApiClientOptions): GamesConfigClient {
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

    images: {
      async upload(resourceId, imageType, filePath, contentType) {
        try {
          const { data } = await http.uploadGamesImage<ImageConfiguration>(
            `/images/${p(resourceId)}/imageType/${p(imageType)}`,
            filePath,
            contentType,
          );
          return data;
        } catch (err) {
          if (isRetiredEndpointError(err)) throw retiredImageEndpointError(err);
          throw err;
        }
      },
    },
  };
}
