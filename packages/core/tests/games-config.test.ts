import { describe, it, expect, vi } from "vitest";
import type { GamesConfigClient } from "@gpc-cli/api";
import {
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
} from "../src/commands/games.js";

function mockConfigClient(): GamesConfigClient {
  return {
    achievements: {
      list: vi.fn().mockResolvedValue({ items: [] }),
      get: vi.fn().mockResolvedValue({
        id: "ach-1",
        achievementType: "STANDARD",
        initialState: "HIDDEN",
        draft: {
          name: { translations: [{ locale: "en-US", value: "First Win" }] },
          description: { translations: [{ locale: "en-US", value: "Win a game" }] },
          pointValue: 10,
        },
      }),
      insert: vi.fn().mockResolvedValue({ id: "ach-new" }),
      update: vi.fn().mockResolvedValue({ id: "ach-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    leaderboards: {
      list: vi.fn().mockResolvedValue({ items: [] }),
      get: vi.fn().mockResolvedValue({
        id: "lb-1",
        scoreOrder: "LARGER_IS_BETTER",
        draft: {
          name: { translations: [{ locale: "en-US", value: "High Scores" }] },
          scoreFormat: { numberFormatType: "NUMERIC" as const },
        },
      }),
      insert: vi.fn().mockResolvedValue({ id: "lb-new" }),
      update: vi.fn().mockResolvedValue({ id: "lb-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
}

const SAMPLE_ACHIEVEMENT = {
  achievementType: "STANDARD" as const,
  initialState: "HIDDEN" as const,
  draft: {
    name: { translations: [{ locale: "en-US", value: "First Win" }] },
    description: { translations: [{ locale: "en-US", value: "Win a game" }] },
    pointValue: 10,
  },
};

const SAMPLE_LEADERBOARD = {
  scoreOrder: "LARGER_IS_BETTER" as const,
  draft: {
    name: { translations: [{ locale: "en-US", value: "High Scores" }] },
    scoreFormat: { numberFormatType: "NUMERIC" as const },
  },
};

describe("games config commands", () => {
  describe("achievement configurations", () => {
    it("listAchievementConfigs calls client with applicationId", async () => {
      const client = mockConfigClient();
      await listAchievementConfigs(client, "123456");
      expect(client.achievements.list).toHaveBeenCalledWith("123456", undefined);
    });

    it("listAchievementConfigs passes pagination options", async () => {
      const client = mockConfigClient();
      await listAchievementConfigs(client, "123456", {
        maxResults: 10,
        pageToken: "token-abc",
      });
      expect(client.achievements.list).toHaveBeenCalledWith("123456", {
        maxResults: 10,
        pageToken: "token-abc",
      });
    });

    it("listAchievementConfigs rejects empty applicationId", async () => {
      const client = mockConfigClient();
      await expect(listAchievementConfigs(client, "")).rejects.toThrow(
        "Application ID is required",
      );
    });

    it("getAchievementConfig calls client with correct ID", async () => {
      const client = mockConfigClient();
      const result = await getAchievementConfig(client, "ach-1");
      expect(client.achievements.get).toHaveBeenCalledWith("ach-1");
      expect(result.id).toBe("ach-1");
    });

    it("getAchievementConfig rejects empty ID", async () => {
      const client = mockConfigClient();
      await expect(getAchievementConfig(client, "")).rejects.toThrow(
        "achievement ID is required",
      );
    });

    it("createAchievementConfig passes data to insert", async () => {
      const client = mockConfigClient();
      const result = await createAchievementConfig(
        client,
        "123456",
        SAMPLE_ACHIEVEMENT,
      );
      expect(client.achievements.insert).toHaveBeenCalledWith(
        "123456",
        SAMPLE_ACHIEVEMENT,
      );
      expect(result.id).toBe("ach-new");
    });

    it("updateAchievementConfig passes data to update", async () => {
      const client = mockConfigClient();
      await updateAchievementConfig(client, "ach-1", SAMPLE_ACHIEVEMENT);
      expect(client.achievements.update).toHaveBeenCalledWith(
        "ach-1",
        SAMPLE_ACHIEVEMENT,
      );
    });

    it("deleteAchievementConfig calls delete with correct ID", async () => {
      const client = mockConfigClient();
      await deleteAchievementConfig(client, "ach-1");
      expect(client.achievements.delete).toHaveBeenCalledWith("ach-1");
    });

    it("diffAchievementConfig detects changes", async () => {
      const client = mockConfigClient();
      const localData = {
        ...SAMPLE_ACHIEVEMENT,
        initialState: "REVEALED" as const,
      };
      const diffs = await diffAchievementConfig(client, "ach-1", localData);
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.some((d) => d.field === "initialState")).toBe(true);
    });

    it("diffAchievementConfig returns empty when no changes", async () => {
      const client = mockConfigClient();
      (client.achievements.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...SAMPLE_ACHIEVEMENT,
        id: "ach-1",
      });
      const diffs = await diffAchievementConfig(
        client,
        "ach-1",
        SAMPLE_ACHIEVEMENT,
      );
      expect(diffs).toEqual([]);
    });
  });

  describe("leaderboard configurations", () => {
    it("listLeaderboardConfigs calls client with applicationId", async () => {
      const client = mockConfigClient();
      await listLeaderboardConfigs(client, "123456");
      expect(client.leaderboards.list).toHaveBeenCalledWith("123456", undefined);
    });

    it("listLeaderboardConfigs passes pagination options", async () => {
      const client = mockConfigClient();
      await listLeaderboardConfigs(client, "123456", {
        maxResults: 5,
        pageToken: "page-2",
      });
      expect(client.leaderboards.list).toHaveBeenCalledWith("123456", {
        maxResults: 5,
        pageToken: "page-2",
      });
    });

    it("listLeaderboardConfigs rejects empty applicationId", async () => {
      const client = mockConfigClient();
      await expect(listLeaderboardConfigs(client, "")).rejects.toThrow(
        "Application ID is required",
      );
    });

    it("getLeaderboardConfig calls client with correct ID", async () => {
      const client = mockConfigClient();
      const result = await getLeaderboardConfig(client, "lb-1");
      expect(client.leaderboards.get).toHaveBeenCalledWith("lb-1");
      expect(result.id).toBe("lb-1");
    });

    it("getLeaderboardConfig rejects empty ID", async () => {
      const client = mockConfigClient();
      await expect(getLeaderboardConfig(client, "")).rejects.toThrow(
        "leaderboard ID is required",
      );
    });

    it("createLeaderboardConfig passes data to insert", async () => {
      const client = mockConfigClient();
      const result = await createLeaderboardConfig(
        client,
        "123456",
        SAMPLE_LEADERBOARD,
      );
      expect(client.leaderboards.insert).toHaveBeenCalledWith(
        "123456",
        SAMPLE_LEADERBOARD,
      );
      expect(result.id).toBe("lb-new");
    });

    it("updateLeaderboardConfig passes data to update", async () => {
      const client = mockConfigClient();
      await updateLeaderboardConfig(client, "lb-1", SAMPLE_LEADERBOARD);
      expect(client.leaderboards.update).toHaveBeenCalledWith(
        "lb-1",
        SAMPLE_LEADERBOARD,
      );
    });

    it("deleteLeaderboardConfig calls delete with correct ID", async () => {
      const client = mockConfigClient();
      await deleteLeaderboardConfig(client, "lb-1");
      expect(client.leaderboards.delete).toHaveBeenCalledWith("lb-1");
    });

    it("diffLeaderboardConfig detects changes", async () => {
      const client = mockConfigClient();
      const localData = {
        ...SAMPLE_LEADERBOARD,
        scoreOrder: "SMALLER_IS_BETTER" as const,
      };
      const diffs = await diffLeaderboardConfig(client, "lb-1", localData);
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.some((d) => d.field === "scoreOrder")).toBe(true);
    });

    it("diffLeaderboardConfig returns empty when no changes", async () => {
      const client = mockConfigClient();
      (client.leaderboards.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...SAMPLE_LEADERBOARD,
        id: "lb-1",
      });
      const diffs = await diffLeaderboardConfig(
        client,
        "lb-1",
        SAMPLE_LEADERBOARD,
      );
      expect(diffs).toEqual([]);
    });
  });
});
