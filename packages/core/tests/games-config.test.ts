import { describe, it, expect, vi } from "vitest";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  setAchievementIcon,
  setLeaderboardIcon,
  pushAchievementConfigs,
  pullAchievementConfigs,
  pushLeaderboardConfigs,
  pullLeaderboardConfigs,
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
    images: {
      upload: vi.fn().mockResolvedValue({
        resourceId: "ach-1",
        imageType: "ACHIEVEMENT_ICON",
        url: "https://x/i.png",
      }),
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
      await expect(getAchievementConfig(client, "")).rejects.toThrow("achievement ID is required");
    });

    it("createAchievementConfig passes data to insert", async () => {
      const client = mockConfigClient();
      const result = await createAchievementConfig(client, "123456", SAMPLE_ACHIEVEMENT);
      expect(client.achievements.insert).toHaveBeenCalledWith("123456", SAMPLE_ACHIEVEMENT);
      expect(result.id).toBe("ach-new");
    });

    it("updateAchievementConfig passes data to update", async () => {
      const client = mockConfigClient();
      await updateAchievementConfig(client, "ach-1", SAMPLE_ACHIEVEMENT);
      expect(client.achievements.update).toHaveBeenCalledWith("ach-1", SAMPLE_ACHIEVEMENT);
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
      const diffs = await diffAchievementConfig(client, "ach-1", SAMPLE_ACHIEVEMENT);
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
      await expect(getLeaderboardConfig(client, "")).rejects.toThrow("leaderboard ID is required");
    });

    it("createLeaderboardConfig passes data to insert", async () => {
      const client = mockConfigClient();
      const result = await createLeaderboardConfig(client, "123456", SAMPLE_LEADERBOARD);
      expect(client.leaderboards.insert).toHaveBeenCalledWith("123456", SAMPLE_LEADERBOARD);
      expect(result.id).toBe("lb-new");
    });

    it("updateLeaderboardConfig passes data to update", async () => {
      const client = mockConfigClient();
      await updateLeaderboardConfig(client, "lb-1", SAMPLE_LEADERBOARD);
      expect(client.leaderboards.update).toHaveBeenCalledWith("lb-1", SAMPLE_LEADERBOARD);
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
      const diffs = await diffLeaderboardConfig(client, "lb-1", SAMPLE_LEADERBOARD);
      expect(diffs).toEqual([]);
    });
  });
});

describe("setAchievementIcon / setLeaderboardIcon (E1)", () => {
  it("uploads an achievement icon with inferred png content type", async () => {
    const client = mockConfigClient();
    await setAchievementIcon(client, "ach-1", "/path/icon.png");
    expect(client.images.upload).toHaveBeenCalledWith(
      "ach-1",
      "ACHIEVEMENT_ICON",
      "/path/icon.png",
      "image/png",
    );
  });

  it("uploads a leaderboard icon with inferred jpeg content type (case-insensitive)", async () => {
    const client = mockConfigClient();
    await setLeaderboardIcon(client, "lb-1", "/path/icon.JPG");
    expect(client.images.upload).toHaveBeenCalledWith(
      "lb-1",
      "LEADERBOARD_ICON",
      "/path/icon.JPG",
      "image/jpeg",
    );
  });

  it("rejects unsupported icon formats", async () => {
    await expect(setAchievementIcon(mockConfigClient(), "ach-1", "/path/icon.gif")).rejects.toThrow(
      /Unsupported icon/,
    );
  });

  it("requires a resource id", async () => {
    await expect(setAchievementIcon(mockConfigClient(), "", "/path/icon.png")).rejects.toThrow();
  });
});

describe("pushAchievementConfigs / pullAchievementConfigs (E3)", () => {
  it("updates configs with an id and inserts those without", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-push-"));
    try {
      await writeFile(
        join(dir, "existing.json"),
        JSON.stringify({ id: "ach-1", ...SAMPLE_ACHIEVEMENT }),
      );
      await writeFile(join(dir, "new.json"), JSON.stringify(SAMPLE_ACHIEVEMENT));
      const client = mockConfigClient();
      const result = await pushAchievementConfigs(client, "12345", dir);
      expect(result.updated).toEqual(["ach-1"]);
      expect(result.created).toEqual(["ach-new"]); // insert mock returns { id: "ach-new" }
      expect(client.achievements.update).toHaveBeenCalledTimes(1);
      expect(client.achievements.insert).toHaveBeenCalledTimes(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("dry-run makes no API calls and reports the file name", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-dry-"));
    try {
      await writeFile(join(dir, "new.json"), JSON.stringify(SAMPLE_ACHIEVEMENT));
      const client = mockConfigClient();
      const result = await pushAchievementConfigs(client, "12345", dir, { dryRun: true });
      expect(client.achievements.insert).not.toHaveBeenCalled();
      expect(result.created).toEqual(["new.json"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws a clear error on invalid config JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-bad-"));
    try {
      await writeFile(join(dir, "broken.json"), "{ not json");
      await expect(pushAchievementConfigs(mockConfigClient(), "12345", dir)).rejects.toThrow(
        /Invalid JSON/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pull writes each config as a JSON file and returns the ids", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-pull-"));
    try {
      const client = mockConfigClient();
      (client.achievements.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [{ id: "ach-1", ...SAMPLE_ACHIEVEMENT }],
      });
      const written = await pullAchievementConfigs(client, "12345", dir);
      expect(written).toEqual(["ach-1"]);
      expect(await readdir(dir)).toContain("ach-1.json");
      const parsed = JSON.parse(await readFile(join(dir, "ach-1.json"), "utf-8"));
      expect(parsed.id).toBe("ach-1");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("push/pull hardening (review fixes)", () => {
  it("push rejects non-object JSON (array/null) with a GpcError, not a TypeError", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-shape-"));
    try {
      await writeFile(join(dir, "arr.json"), "[1,2,3]");
      await expect(pushAchievementConfigs(mockConfigClient(), "12345", dir)).rejects.toThrow(
        /is not a config object/,
      );
      await writeFile(join(dir, "arr.json"), "null");
      await expect(pushAchievementConfigs(mockConfigClient(), "12345", dir)).rejects.toThrow(
        /is not a config object/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("dry-run push skips the UPDATE call for configs with an id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-dryupd-"));
    try {
      await writeFile(
        join(dir, "existing.json"),
        JSON.stringify({ id: "ach-1", ...SAMPLE_ACHIEVEMENT }),
      );
      const client = mockConfigClient();
      const result = await pushAchievementConfigs(client, "12345", dir, { dryRun: true });
      expect(client.achievements.update).not.toHaveBeenCalled();
      expect(result.updated).toEqual(["ach-1"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaderboard push updates by id and inserts without id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-lb-"));
    try {
      await writeFile(
        join(dir, "existing.json"),
        JSON.stringify({ id: "lb-1", ...SAMPLE_LEADERBOARD }),
      );
      await writeFile(join(dir, "new.json"), JSON.stringify(SAMPLE_LEADERBOARD));
      const client = mockConfigClient();
      const result = await pushLeaderboardConfigs(client, "12345", dir);
      expect(result.updated).toEqual(["lb-1"]);
      expect(result.created).toEqual(["lb-new"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pull follows pagination and writes every page", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-games-page-"));
    try {
      const client = mockConfigClient();
      const list = client.leaderboards.list as ReturnType<typeof vi.fn>;
      list
        .mockResolvedValueOnce({
          items: [{ id: "lb-1", ...SAMPLE_LEADERBOARD }],
          nextPageToken: "page-2",
        })
        .mockResolvedValueOnce({ items: [{ id: "lb-2", ...SAMPLE_LEADERBOARD }] });
      const written = await pullLeaderboardConfigs(client, "12345", dir);
      expect(written).toEqual(["lb-1", "lb-2"]);
      expect(list).toHaveBeenCalledTimes(2);
      expect(list).toHaveBeenLastCalledWith("12345", { maxResults: 200, pageToken: "page-2" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
