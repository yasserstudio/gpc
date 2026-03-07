import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GpcError, ConfigError, ApiError, NetworkError } from "../src/errors";
import { detectOutputFormat, formatOutput } from "../src/output";
import {
  uploadRelease,
  getReleasesStatus,
  promoteRelease,
  updateRollout,
  listTracks,
} from "../src/commands/releases.js";
import {
  getListings,
  updateListing,
  deleteListing,
  pullListings,
  pushListings,
  listImages,
  uploadImage,
  deleteImage,
  getCountryAvailability,
  updateAppDetails,
} from "../src/commands/listings.js";
import {
  listReviews,
  getReview,
  replyToReview,
  exportReviews,
} from "../src/commands/reviews.js";
import {
  getVitalsOverview,
  getVitalsCrashes,
  getVitalsAnr,
  getVitalsStartup,
  getVitalsRendering,
  getVitalsBattery,
  getVitalsMemory,
  getVitalsAnomalies,
  searchVitalsErrors,
  checkThreshold,
} from "../src/commands/vitals.js";
import { isValidBcp47, GOOGLE_PLAY_LANGUAGES } from "../src/utils/bcp47.js";
import { readListingsFromDir, writeListingsToDir, diffListings } from "../src/utils/fastlane.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// GpcError
// ---------------------------------------------------------------------------
describe("GpcError", () => {
  it("is an instance of Error", () => {
    const err = new GpcError("boom", "SOME_CODE", 2);
    expect(err).toBeInstanceOf(Error);
  });

  it("has correct name, code, exitCode, message, and suggestion", () => {
    const err = new GpcError("something failed", "FAIL_CODE", 3, "try again");
    expect(err.name).toBe("GpcError");
    expect(err.code).toBe("FAIL_CODE");
    expect(err.exitCode).toBe(3);
    expect(err.message).toBe("something failed");
    expect(err.suggestion).toBe("try again");
  });

  it("toJSON() returns the expected error structure", () => {
    const err = new GpcError("bad input", "BAD_INPUT", 1, "check input");
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: "BAD_INPUT",
        message: "bad input",
        suggestion: "check input",
      },
    });
  });

  it("toJSON() has undefined suggestion when none provided", () => {
    const err = new GpcError("oops", "OOPS", 1);
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: "OOPS",
        message: "oops",
        suggestion: undefined,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// ConfigError
// ---------------------------------------------------------------------------
describe("ConfigError", () => {
  it("has exitCode 1", () => {
    const err = new ConfigError("missing key", "MISSING_KEY");
    expect(err.exitCode).toBe(1);
  });

  it('has correct name "ConfigError"', () => {
    const err = new ConfigError("bad config", "BAD_CFG");
    expect(err.name).toBe("ConfigError");
  });

  it("inherits from GpcError", () => {
    const err = new ConfigError("msg", "CODE", "hint");
    expect(err).toBeInstanceOf(GpcError);
    expect(err).toBeInstanceOf(Error);
    expect(err.suggestion).toBe("hint");
  });
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------
describe("ApiError", () => {
  it("has exitCode 4", () => {
    const err = new ApiError("not found", "NOT_FOUND", 404);
    expect(err.exitCode).toBe(4);
  });

  it('has correct name "ApiError"', () => {
    const err = new ApiError("unauthorized", "UNAUTH", 401);
    expect(err.name).toBe("ApiError");
  });

  it("stores statusCode", () => {
    const err = new ApiError("server error", "SERVER_ERR", 500, "retry later");
    expect(err.statusCode).toBe(500);
    expect(err.suggestion).toBe("retry later");
  });

  it("inherits from GpcError", () => {
    const err = new ApiError("fail", "FAIL");
    expect(err).toBeInstanceOf(GpcError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// NetworkError
// ---------------------------------------------------------------------------
describe("NetworkError", () => {
  it("has exitCode 5", () => {
    const err = new NetworkError("timeout");
    expect(err.exitCode).toBe(5);
  });

  it('has code "NETWORK_ERROR"', () => {
    const err = new NetworkError("no internet");
    expect(err.code).toBe("NETWORK_ERROR");
  });

  it('has correct name "NetworkError"', () => {
    const err = new NetworkError("dns failed");
    expect(err.name).toBe("NetworkError");
  });
});

// ---------------------------------------------------------------------------
// detectOutputFormat
// ---------------------------------------------------------------------------
describe("detectOutputFormat", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY as boolean;
  });

  it('returns "json" when stdout is not a TTY', () => {
    process.stdout.isTTY = false as unknown as boolean;
    expect(detectOutputFormat()).toBe("json");
  });

  it('returns "table" when stdout is a TTY', () => {
    process.stdout.isTTY = true;
    expect(detectOutputFormat()).toBe("table");
  });
});

// ---------------------------------------------------------------------------
// formatOutput – JSON
// ---------------------------------------------------------------------------
describe("formatOutput – json", () => {
  it("formats an object with 2-space indent", () => {
    const data = { name: "app", version: 1 };
    const result = formatOutput(data, "json");
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("formats an array", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = formatOutput(data, "json");
    expect(result).toBe(JSON.stringify(data, null, 2));
  });
});

// ---------------------------------------------------------------------------
// formatOutput – YAML
// ---------------------------------------------------------------------------
describe("formatOutput – yaml", () => {
  it("formats a simple object as key-value pairs", () => {
    const result = formatOutput({ name: "test", count: 3 }, "yaml");
    expect(result).toContain("name: test");
    expect(result).toContain("count: 3");
  });
});

// ---------------------------------------------------------------------------
// formatOutput – Table
// ---------------------------------------------------------------------------
describe("formatOutput – table", () => {
  it("formats a single object as a table", () => {
    const result = formatOutput({ name: "app", version: "1.0" }, "table");
    const lines = result.split("\n");
    // header, separator, one data row
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("name");
    expect(lines[0]).toContain("version");
    expect(lines[2]).toContain("app");
    expect(lines[2]).toContain("1.0");
  });

  it("formats an array of objects as a table with headers", () => {
    const data = [
      { id: 1, status: "ok" },
      { id: 2, status: "fail" },
    ];
    const result = formatOutput(data, "table");
    const lines = result.split("\n");
    // header + separator + 2 data rows
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("status");
    expect(lines[1]).toMatch(/^-/);
    expect(lines[2]).toContain("1");
    expect(lines[3]).toContain("fail");
  });

  it("returns empty string for empty array", () => {
    expect(formatOutput([], "table")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatOutput – Markdown
// ---------------------------------------------------------------------------
describe("formatOutput – markdown", () => {
  it("formats as pipe-separated markdown table", () => {
    const data = [{ col: "val" }];
    const result = formatOutput(data, "markdown");
    const lines = result.split("\n");
    expect(lines[0]).toMatch(/^\|.*\|$/);
    expect(lines[2]).toMatch(/^\|.*val.*\|$/);
  });

  it("includes header separator row", () => {
    const data = [{ a: 1, b: 2 }];
    const result = formatOutput(data, "markdown");
    const lines = result.split("\n");
    // second line should be the separator with dashes
    expect(lines[1]).toMatch(/^\|\s*-+\s*\|\s*-+\s*\|$/);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 – Releases module
// ---------------------------------------------------------------------------

const PKG = "com.example.app";

function mockClient() {
  return {
    edits: {
      insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
      get: vi.fn(),
      validate: vi.fn().mockResolvedValue({ id: "edit-1" }),
      commit: vi.fn().mockResolvedValue({ id: "edit-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    details: {
      get: vi.fn(),
      update: vi.fn(),
      patch: vi.fn().mockResolvedValue({ defaultLanguage: "en-US", title: "My App" }),
    },
    bundles: {
      list: vi.fn(),
      upload: vi.fn().mockResolvedValue({ versionCode: 42, sha256: "abc123" }),
    },
    tracks: {
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue({ track: "internal", releases: [] }),
    },
    listings: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      update: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn(),
    },
    images: {
      list: vi.fn().mockResolvedValue([]),
      upload: vi.fn().mockResolvedValue({ id: "img-1", url: "https://example.com/img.png", sha1: "a", sha256: "b" }),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn(),
    },
    countryAvailability: {
      get: vi.fn().mockResolvedValue({ countryTargeting: { countries: ["US"], includeRestOfWorld: false } }),
    },
    reviews: {
      list: vi.fn().mockResolvedValue({ reviews: [] }),
      get: vi.fn().mockResolvedValue({ reviewId: "r1", authorName: "User", comments: [] }),
      reply: vi.fn().mockResolvedValue({ result: { replyText: "Thanks!", lastEdited: { seconds: "123" } } }),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// uploadRelease
// ---------------------------------------------------------------------------
describe("uploadRelease", () => {
  it("happy path: insert → upload → track update → validate → commit", async () => {
    const client = mockClient();
    const result = await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "internal",
      status: "completed",
    });

    expect(client.edits.insert).toHaveBeenCalledWith(PKG);
    expect(client.bundles.upload).toHaveBeenCalledWith(PKG, "edit-1", "/tmp/app.aab");
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "internal", expect.objectContaining({
      versionCodes: ["42"],
      status: "completed",
    }));
    expect(client.edits.validate).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.commit).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.delete).not.toHaveBeenCalled();
  });

  it("returns correct UploadResult", async () => {
    const client = mockClient();
    const result = await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "production",
      status: "completed",
      releaseName: "v1.0",
    });

    expect(result).toEqual({
      versionCode: 42,
      track: "production",
      status: "completed",
    });
  });

  it("defaults to inProgress when userFraction is provided and no explicit status", async () => {
    const client = mockClient();
    const result = await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "production",
      userFraction: 0.1,
    });

    expect(result.status).toBe("inProgress");
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "inProgress",
      userFraction: 0.1,
    }));
  });

  it("passes releaseNotes and releaseName to the track update", async () => {
    const client = mockClient();
    const notes = [{ language: "en-US", text: "Bug fixes" }];
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "beta",
      releaseNotes: notes,
      releaseName: "v2.0",
    });

    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "beta", expect.objectContaining({
      releaseNotes: notes,
      name: "v2.0",
    }));
  });

  it("deletes edit on error and rethrows", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("upload failed"));

    await expect(uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" }))
      .rejects.toThrow("upload failed");

    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("suppresses delete failure when cleaning up after error", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("upload failed"));
    client.edits.delete.mockRejectedValue(new Error("delete also failed"));

    await expect(uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" }))
      .rejects.toThrow("upload failed");
  });
});

// ---------------------------------------------------------------------------
// getReleasesStatus
// ---------------------------------------------------------------------------
describe("getReleasesStatus", () => {
  it("returns all releases across multiple tracks", async () => {
    const client = mockClient();
    client.tracks.list.mockResolvedValue([
      {
        track: "internal",
        releases: [
          { versionCodes: ["10"], status: "completed" },
        ],
      },
      {
        track: "production",
        releases: [
          { versionCodes: ["8"], status: "completed" },
          { versionCodes: ["9"], status: "inProgress", userFraction: 0.5 },
        ],
      },
    ]);

    const results = await getReleasesStatus(client, PKG);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      track: "internal",
      status: "completed",
      versionCodes: ["10"],
      userFraction: undefined,
      releaseNotes: undefined,
    });
    expect(results[2]).toEqual({
      track: "production",
      status: "inProgress",
      versionCodes: ["9"],
      userFraction: 0.5,
      releaseNotes: undefined,
    });
    // Should delete edit (not commit)
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("uses tracks.get when trackFilter is provided", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [{ versionCodes: ["20"], status: "completed" }],
    });

    const results = await getReleasesStatus(client, PKG, "beta");

    expect(client.tracks.get).toHaveBeenCalledWith(PKG, "edit-1", "beta");
    expect(client.tracks.list).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].track).toBe("beta");
  });

  it("handles tracks with empty or undefined releases", async () => {
    const client = mockClient();
    client.tracks.list.mockResolvedValue([
      { track: "internal", releases: [] },
      { track: "alpha" },
    ]);

    const results = await getReleasesStatus(client, PKG);
    expect(results).toHaveLength(0);
  });

  it("deletes edit on error and rethrows", async () => {
    const client = mockClient();
    client.tracks.list.mockRejectedValue(new Error("api error"));

    await expect(getReleasesStatus(client, PKG)).rejects.toThrow("api error");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// promoteRelease
// ---------------------------------------------------------------------------
describe("promoteRelease", () => {
  it("copies a completed release from source to target track", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [
        { versionCodes: ["42"], status: "completed", releaseNotes: [{ language: "en-US", text: "notes" }] },
      ],
    });

    const result = await promoteRelease(client, PKG, "internal", "production");

    expect(client.tracks.get).toHaveBeenCalledWith(PKG, "edit-1", "internal");
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      versionCodes: ["42"],
      status: "completed",
      releaseNotes: [{ language: "en-US", text: "notes" }],
    }));
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
    expect(result).toEqual({
      track: "production",
      status: "completed",
      versionCodes: ["42"],
      userFraction: undefined,
    });
  });

  it("throws when no active release found on source track", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [{ versionCodes: ["1"], status: "draft" }],
    });

    await expect(promoteRelease(client, PKG, "internal", "production"))
      .rejects.toThrow('No active release found on track "internal"');
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("throws when source track has no releases at all", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({ track: "internal" });

    await expect(promoteRelease(client, PKG, "internal", "production"))
      .rejects.toThrow('No active release found on track "internal"');
  });

  it("handles userFraction – sets status to inProgress", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [{ versionCodes: ["50"], status: "completed" }],
    });

    const result = await promoteRelease(client, PKG, "beta", "production", {
      userFraction: 0.25,
    });

    expect(result.status).toBe("inProgress");
    expect(result.userFraction).toBe(0.25);
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "inProgress",
      userFraction: 0.25,
    }));
  });

  it("uses provided releaseNotes over source release notes", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [
        { versionCodes: ["42"], status: "completed", releaseNotes: [{ language: "en-US", text: "old" }] },
      ],
    });

    const newNotes = [{ language: "en-US", text: "new notes" }];
    await promoteRelease(client, PKG, "internal", "production", { releaseNotes: newNotes });

    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      releaseNotes: newNotes,
    }));
  });

  it("picks inProgress release as active source", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [
        { versionCodes: ["5"], status: "draft" },
        { versionCodes: ["6"], status: "inProgress", userFraction: 0.5 },
      ],
    });

    const result = await promoteRelease(client, PKG, "production", "beta");
    expect(result.versionCodes).toEqual(["6"]);
  });
});

// ---------------------------------------------------------------------------
// updateRollout
// ---------------------------------------------------------------------------
describe("updateRollout", () => {
  it("increase: sets inProgress with new fraction", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    const result = await updateRollout(client, PKG, "production", "increase", 0.5);

    expect(result).toEqual({
      track: "production",
      status: "inProgress",
      versionCodes: ["42"],
      userFraction: 0.5,
    });
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "inProgress",
      userFraction: 0.5,
    }));
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("increase: throws when userFraction is not provided", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    await expect(updateRollout(client, PKG, "production", "increase"))
      .rejects.toThrow("--to <percentage> is required for rollout increase");
  });

  it("halt: sets halted with existing fraction", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.3 }],
    });

    const result = await updateRollout(client, PKG, "production", "halt");

    expect(result.status).toBe("halted");
    expect(result.userFraction).toBe(0.3);
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "halted",
      userFraction: 0.3,
    }));
  });

  it("resume: sets inProgress with existing fraction from halted release", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "halted", userFraction: 0.3 }],
    });

    const result = await updateRollout(client, PKG, "production", "resume");

    expect(result.status).toBe("inProgress");
    expect(result.userFraction).toBe(0.3);
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "inProgress",
      userFraction: 0.3,
    }));
  });

  it("complete: sets completed without fraction", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.5 }],
    });

    const result = await updateRollout(client, PKG, "production", "complete");

    expect(result.status).toBe("completed");
    expect(result.userFraction).toBeUndefined();
    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      status: "completed",
    }));
    // Should NOT have userFraction in the release
    const updateCall = client.tracks.update.mock.calls[0][3];
    expect(updateCall).not.toHaveProperty("userFraction");
  });

  it("throws when no active rollout found", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "completed" }],
    });

    await expect(updateRollout(client, PKG, "production", "halt"))
      .rejects.toThrow('No active rollout found on track "production"');
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("throws when track has no releases", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({ track: "production" });

    await expect(updateRollout(client, PKG, "production", "halt"))
      .rejects.toThrow('No active rollout found on track "production"');
  });

  it("preserves releaseNotes from current release", async () => {
    const client = mockClient();
    const notes = [{ language: "en-US", text: "fixes" }];
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.2, releaseNotes: notes }],
    });

    await updateRollout(client, PKG, "production", "increase", 0.5);

    expect(client.tracks.update).toHaveBeenCalledWith(PKG, "edit-1", "production", expect.objectContaining({
      releaseNotes: notes,
    }));
  });
});

// ---------------------------------------------------------------------------
// listTracks
// ---------------------------------------------------------------------------
describe("listTracks", () => {
  it("returns the list of tracks", async () => {
    const client = mockClient();
    const trackList = [
      { track: "internal", releases: [] },
      { track: "production", releases: [] },
    ];
    client.tracks.list.mockResolvedValue(trackList);

    const result = await listTracks(client, PKG);

    expect(result).toEqual(trackList);
    expect(client.edits.insert).toHaveBeenCalledWith(PKG);
    expect(client.tracks.list).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("deletes edit on error and rethrows", async () => {
    const client = mockClient();
    client.tracks.list.mockRejectedValue(new Error("list failed"));

    await expect(listTracks(client, PKG)).rejects.toThrow("list failed");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("does not commit the edit", async () => {
    const client = mockClient();
    client.tracks.list.mockResolvedValue([]);

    await listTracks(client, PKG);

    expect(client.edits.commit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – BCP 47 Validation
// ---------------------------------------------------------------------------
describe("isValidBcp47", () => {
  it("returns true for valid Google Play language codes", () => {
    expect(isValidBcp47("en-US")).toBe(true);
    expect(isValidBcp47("ja-JP")).toBe(true);
    expect(isValidBcp47("fr-FR")).toBe(true);
    expect(isValidBcp47("ar")).toBe(true);
  });

  it("returns false for invalid language codes", () => {
    expect(isValidBcp47("en_US")).toBe(false);
    expect(isValidBcp47("invalid")).toBe(false);
    expect(isValidBcp47("")).toBe(false);
    expect(isValidBcp47("xx-YY")).toBe(false);
  });

  it("GOOGLE_PLAY_LANGUAGES has expected count", () => {
    expect(GOOGLE_PLAY_LANGUAGES.length).toBeGreaterThan(70);
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – Fastlane utils
// ---------------------------------------------------------------------------
describe("diffListings", () => {
  it("detects field differences between local and remote", () => {
    const local = [{ language: "en-US", title: "New Title", shortDescription: "short", fullDescription: "full" }];
    const remote = [{ language: "en-US", title: "Old Title", shortDescription: "short", fullDescription: "full" }];

    const diffs = diffListings(local, remote);

    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("title");
    expect(diffs[0].local).toBe("New Title");
    expect(diffs[0].remote).toBe("Old Title");
  });

  it("detects new languages (local only)", () => {
    const local = [{ language: "fr-FR", title: "Bonjour", shortDescription: "s", fullDescription: "f" }];
    const remote: any[] = [];

    const diffs = diffListings(local, remote);

    expect(diffs.length).toBeGreaterThanOrEqual(1);
    expect(diffs.every((d) => d.language === "fr-FR")).toBe(true);
    expect(diffs.every((d) => d.remote === "")).toBe(true);
  });

  it("detects remote-only languages", () => {
    const local: any[] = [];
    const remote = [{ language: "de-DE", title: "Hallo", shortDescription: "s", fullDescription: "f" }];

    const diffs = diffListings(local, remote);

    expect(diffs.length).toBeGreaterThanOrEqual(1);
    expect(diffs.every((d) => d.language === "de-DE")).toBe(true);
    expect(diffs.every((d) => d.local === "")).toBe(true);
  });

  it("returns empty array when local and remote match", () => {
    const listing = { language: "en-US", title: "Same", shortDescription: "same", fullDescription: "same" };
    const diffs = diffListings([listing], [{ ...listing }]);

    expect(diffs).toHaveLength(0);
  });
});

describe("writeListingsToDir / readListingsFromDir", () => {
  it("round-trips listings through the filesystem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    try {
      const listings = [
        { language: "en-US", title: "My App", shortDescription: "Short", fullDescription: "Full desc" },
        { language: "ja-JP", title: "My App JP", shortDescription: "Short JP", fullDescription: "Full JP" },
      ];

      await writeListingsToDir(dir, listings);
      const result = await readListingsFromDir(dir);

      expect(result).toHaveLength(2);
      const enUS = result.find((l: any) => l.language === "en-US");
      expect(enUS).toBeDefined();
      expect(enUS!.title).toBe("My App");
      expect(enUS!.shortDescription).toBe("Short");
      expect(enUS!.fullDescription).toBe("Full desc");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns empty array for non-existent directory", async () => {
    const result = await readListingsFromDir("/tmp/gpc-nonexistent-dir-" + Date.now());
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – getListings
// ---------------------------------------------------------------------------
describe("getListings", () => {
  it("returns all listings when no language specified", async () => {
    const client = mockClient();
    const listings = [
      { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
      { language: "ja-JP", title: "App JP", shortDescription: "s", fullDescription: "f" },
    ];
    client.listings.list.mockResolvedValue(listings);

    const result = await getListings(client, PKG);

    expect(result).toEqual(listings);
    expect(client.edits.insert).toHaveBeenCalledWith(PKG);
    expect(client.listings.list).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("returns single listing when language specified", async () => {
    const client = mockClient();
    const listing = { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" };
    client.listings.get.mockResolvedValue(listing);

    const result = await getListings(client, PKG, "en-US");

    expect(result).toEqual([listing]);
    expect(client.listings.get).toHaveBeenCalledWith(PKG, "edit-1", "en-US");
    expect(client.listings.list).not.toHaveBeenCalled();
  });

  it("throws on invalid language code", async () => {
    const client = mockClient();
    await expect(getListings(client, PKG, "invalid")).rejects.toThrow("Invalid language tag");
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.listings.list.mockRejectedValue(new Error("api fail"));

    await expect(getListings(client, PKG)).rejects.toThrow("api fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – updateListing
// ---------------------------------------------------------------------------
describe("updateListing", () => {
  it("patches listing, validates, and commits", async () => {
    const client = mockClient();
    const updated = { language: "en-US", title: "New", shortDescription: "s", fullDescription: "f" };
    client.listings.patch.mockResolvedValue(updated);

    const result = await updateListing(client, PKG, "en-US", { title: "New" });

    expect(result).toEqual(updated);
    expect(client.listings.patch).toHaveBeenCalledWith(PKG, "edit-1", "en-US", { title: "New" });
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("throws on invalid language code", async () => {
    const client = mockClient();
    await expect(updateListing(client, PKG, "bad", { title: "X" })).rejects.toThrow("Invalid language tag");
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.listings.patch.mockRejectedValue(new Error("patch fail"));

    await expect(updateListing(client, PKG, "en-US", { title: "X" })).rejects.toThrow("patch fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – deleteListing
// ---------------------------------------------------------------------------
describe("deleteListing", () => {
  it("deletes listing, validates, and commits", async () => {
    const client = mockClient();

    await deleteListing(client, PKG, "en-US");

    expect(client.listings.delete).toHaveBeenCalledWith(PKG, "edit-1", "en-US");
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("throws on invalid language code", async () => {
    const client = mockClient();
    await expect(deleteListing(client, PKG, "nope")).rejects.toThrow("Invalid language tag");
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.listings.delete.mockRejectedValue(new Error("delete fail"));

    await expect(deleteListing(client, PKG, "en-US")).rejects.toThrow("delete fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – pushListings
// ---------------------------------------------------------------------------
describe("pushListings", () => {
  it("uploads local listings, validates, and commits", async () => {
    const client = mockClient();

    const dir = await mkdtemp(join(tmpdir(), "gpc-push-"));

    try {
      await writeListingsToDir(dir, [
        { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
      ]);

      const result = await pushListings(client, PKG, dir);

      expect(result).toEqual({ updated: 1, languages: ["en-US"] });
      expect(client.listings.update).toHaveBeenCalledWith(PKG, "edit-1", "en-US", {
        title: "App",
        shortDescription: "s",
        fullDescription: "f",
      });
      expect(client.edits.validate).toHaveBeenCalled();
      expect(client.edits.commit).toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("dry-run returns diffs without committing", async () => {
    const client = mockClient();
    client.listings.list.mockResolvedValue([
      { language: "en-US", title: "Old", shortDescription: "s", fullDescription: "f" },
    ]);

    const dir = await mkdtemp(join(tmpdir(), "gpc-dry-"));

    try {
      await writeListingsToDir(dir, [
        { language: "en-US", title: "New", shortDescription: "s", fullDescription: "f" },
      ]);

      const result = await pushListings(client, PKG, dir, { dryRun: true });

      expect((result as any).diffs).toBeDefined();
      expect((result as any).diffs.length).toBeGreaterThan(0);
      expect(client.edits.commit).not.toHaveBeenCalled();
      expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("throws when directory has no listings", async () => {
    const client = mockClient();
    const dir = await mkdtemp(join(tmpdir(), "gpc-empty-"));

    try {
      await expect(pushListings(client, PKG, dir)).rejects.toThrow("No listings found");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – listImages
// ---------------------------------------------------------------------------
describe("listImages", () => {
  it("returns images for a language and type", async () => {
    const client = mockClient();
    const images = [{ id: "1", url: "https://example.com/1.png", sha1: "a", sha256: "b" }];
    client.images.list.mockResolvedValue(images);

    const result = await listImages(client, PKG, "en-US", "phoneScreenshots");

    expect(result).toEqual(images);
    expect(client.images.list).toHaveBeenCalledWith(PKG, "edit-1", "en-US", "phoneScreenshots");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("throws on invalid language", async () => {
    const client = mockClient();
    await expect(listImages(client, PKG, "bad", "icon")).rejects.toThrow("Invalid language tag");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – uploadImage
// ---------------------------------------------------------------------------
describe("uploadImage", () => {
  it("uploads, validates, and commits", async () => {
    const client = mockClient();

    const result = await uploadImage(client, PKG, "en-US", "icon", "/tmp/icon.png");

    expect(client.images.upload).toHaveBeenCalledWith(PKG, "edit-1", "en-US", "icon", "/tmp/icon.png");
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
    expect(result).toHaveProperty("id");
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.images.upload.mockRejectedValue(new Error("upload fail"));

    await expect(uploadImage(client, PKG, "en-US", "icon", "/tmp/icon.png")).rejects.toThrow("upload fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – deleteImage
// ---------------------------------------------------------------------------
describe("deleteImage", () => {
  it("deletes image, validates, and commits", async () => {
    const client = mockClient();

    await deleteImage(client, PKG, "en-US", "phoneScreenshots", "img-1");

    expect(client.images.delete).toHaveBeenCalledWith(PKG, "edit-1", "en-US", "phoneScreenshots", "img-1");
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.images.delete.mockRejectedValue(new Error("delete fail"));

    await expect(deleteImage(client, PKG, "en-US", "icon", "img-1")).rejects.toThrow("delete fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – getCountryAvailability
// ---------------------------------------------------------------------------
describe("getCountryAvailability", () => {
  it("returns availability for a track", async () => {
    const client = mockClient();

    const result = await getCountryAvailability(client, PKG, "production");

    expect(result).toEqual({ countryTargeting: { countries: ["US"], includeRestOfWorld: false } });
    expect(client.countryAvailability.get).toHaveBeenCalledWith(PKG, "edit-1", "production");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.countryAvailability.get.mockRejectedValue(new Error("avail fail"));

    await expect(getCountryAvailability(client, PKG, "production")).rejects.toThrow("avail fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 4 – updateAppDetails
// ---------------------------------------------------------------------------
describe("updateAppDetails", () => {
  it("patches details, validates, and commits", async () => {
    const client = mockClient();

    const result = await updateAppDetails(client, PKG, { contactEmail: "test@example.com" });

    expect(result).toEqual({ defaultLanguage: "en-US", title: "My App" });
    expect(client.details.patch).toHaveBeenCalledWith(PKG, "edit-1", { contactEmail: "test@example.com" });
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.details.patch.mockRejectedValue(new Error("details fail"));

    await expect(updateAppDetails(client, PKG, { contactEmail: "x" })).rejects.toThrow("details fail");
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 – Reviews
// ---------------------------------------------------------------------------

function makeReview(overrides: {
  reviewId?: string;
  starRating?: number;
  language?: string;
  seconds?: string;
  text?: string;
} = {}) {
  return {
    reviewId: overrides.reviewId ?? "r1",
    authorName: "User",
    comments: [{
      userComment: {
        text: overrides.text ?? "Great app!",
        lastModified: { seconds: overrides.seconds ?? "1700000000" },
        starRating: overrides.starRating ?? 5,
        reviewerLanguage: overrides.language ?? "en",
      },
    }],
  };
}

describe("listReviews", () => {
  it("returns all reviews when no filters", async () => {
    const client = mockClient();
    const reviews = [makeReview(), makeReview({ reviewId: "r2" })];
    client.reviews.list.mockResolvedValue({ reviews });

    const result = await listReviews(client, PKG);
    expect(result).toHaveLength(2);
  });

  it("filters by star rating", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [makeReview({ starRating: 5 }), makeReview({ reviewId: "r2", starRating: 1 })],
    });

    const result = await listReviews(client, PKG, { stars: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].reviewId).toBe("r2");
  });

  it("filters by language", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [makeReview({ language: "en" }), makeReview({ reviewId: "r2", language: "ja" })],
    });

    const result = await listReviews(client, PKG, { language: "ja" });
    expect(result).toHaveLength(1);
    expect(result[0].reviewId).toBe("r2");
  });

  it("filters by since date", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [
        makeReview({ seconds: "1700000000" }),
        makeReview({ reviewId: "r2", seconds: "1600000000" }),
      ],
    });

    const result = await listReviews(client, PKG, { since: "2023-11-14T00:00:00Z" });
    expect(result).toHaveLength(1);
    expect(result[0].reviewId).toBe("r1");
  });

  it("passes translationLanguage to API", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({ reviews: [] });

    await listReviews(client, PKG, { translationLanguage: "fr" });

    expect(client.reviews.list).toHaveBeenCalledWith(PKG, expect.objectContaining({
      translationLanguage: "fr",
    }));
  });
});

describe("getReview", () => {
  it("returns a single review", async () => {
    const client = mockClient();
    const review = makeReview();
    client.reviews.get.mockResolvedValue(review);

    const result = await getReview(client, PKG, "r1");
    expect(result).toEqual(review);
    expect(client.reviews.get).toHaveBeenCalledWith(PKG, "r1", undefined);
  });

  it("passes translationLanguage", async () => {
    const client = mockClient();
    await getReview(client, PKG, "r1", "de");
    expect(client.reviews.get).toHaveBeenCalledWith(PKG, "r1", "de");
  });
});

describe("replyToReview", () => {
  it("calls API with reply text", async () => {
    const client = mockClient();
    const result = await replyToReview(client, PKG, "r1", "Thanks!");
    expect(result).toEqual({ result: { replyText: "Thanks!", lastEdited: { seconds: "123" } } });
    expect(client.reviews.reply).toHaveBeenCalledWith(PKG, "r1", "Thanks!");
  });

  it("throws when reply exceeds 350 characters", async () => {
    const client = mockClient();
    const longText = "a".repeat(351);
    await expect(replyToReview(client, PKG, "r1", longText))
      .rejects.toThrow("exceeds 350 characters");
  });

  it("throws when reply is empty", async () => {
    const client = mockClient();
    await expect(replyToReview(client, PKG, "r1", ""))
      .rejects.toThrow("cannot be empty");
  });
});

describe("exportReviews", () => {
  it("exports as JSON by default", async () => {
    const client = mockClient();
    const reviews = [makeReview()];
    client.reviews.list.mockResolvedValue({ reviews });

    const result = await exportReviews(client, PKG);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].reviewId).toBe("r1");
  });

  it("exports as CSV", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [makeReview({ text: "Great app!" })],
    });

    const result = await exportReviews(client, PKG, { format: "csv" });
    const lines = result.split("\n");
    expect(lines[0]).toBe("reviewId,authorName,starRating,text,language,date,device,appVersionName");
    expect(lines[1]).toContain("r1");
    expect(lines[1]).toContain("Great app!");
  });

  it("CSV escapes commas and quotes", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [makeReview({ text: 'Has "quotes" and, commas' })],
    });

    const result = await exportReviews(client, PKG, { format: "csv" });
    expect(result).toContain('"Has ""quotes"" and, commas"');
  });

  it("paginates through all pages", async () => {
    const client = mockClient();
    client.reviews.list
      .mockResolvedValueOnce({
        reviews: [makeReview()],
        tokenPagination: { nextPageToken: "page2" },
      })
      .mockResolvedValueOnce({
        reviews: [makeReview({ reviewId: "r2" })],
      });

    const result = await exportReviews(client, PKG);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(client.reviews.list).toHaveBeenCalledTimes(2);
  });

  it("applies filters during export", async () => {
    const client = mockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [makeReview({ starRating: 5 }), makeReview({ reviewId: "r2", starRating: 1 })],
    });

    const result = await exportReviews(client, PKG, { stars: 5 });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Phase 5 – Vitals
// ---------------------------------------------------------------------------

function mockReportingClient() {
  return {
    queryMetricSet: vi.fn().mockResolvedValue({ rows: [] }),
    getAnomalies: vi.fn().mockResolvedValue({ anomalies: [] }),
    searchErrorIssues: vi.fn().mockResolvedValue({ errorIssues: [] }),
    searchErrorReports: vi.fn().mockResolvedValue({ errorReports: [] }),
  } as any;
}

describe("getVitalsOverview", () => {
  it("queries all metric sets and returns overview", async () => {
    const reporting = mockReportingClient();
    reporting.queryMetricSet.mockResolvedValue({ rows: [{ metrics: {} }] });

    const result = await getVitalsOverview(reporting, PKG);

    expect(result).toHaveProperty("crashRate");
    expect(result).toHaveProperty("anrRate");
    expect(result).toHaveProperty("slowStartRate");
    expect(result).toHaveProperty("slowRenderingRate");
    expect(result).toHaveProperty("excessiveWakeupRate");
    expect(result).toHaveProperty("stuckWakelockRate");
    // 6 metric sets queried
    expect(reporting.queryMetricSet).toHaveBeenCalledTimes(6);
  });

  it("handles partial failures gracefully", async () => {
    const reporting = mockReportingClient();
    reporting.queryMetricSet
      .mockResolvedValueOnce({ rows: [{ metrics: {} }] })
      .mockRejectedValueOnce(new Error("anr fail"))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getVitalsOverview(reporting, PKG);
    expect(result.crashRate).toHaveLength(1);
    expect(result.anrRate).toBeUndefined();
  });
});

describe("getVitalsCrashes", () => {
  it("queries vitals.crashrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.crashrate", expect.any(Object));
  });

  it("passes dimension option", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG, { dimension: "versionCode" });
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.crashrate", expect.objectContaining({
      dimensions: ["versionCode"],
    }));
  });

  it("passes days option as timeline spec", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG, { days: 7 });
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.crashrate", expect.objectContaining({
      timelineSpec: expect.objectContaining({
        aggregationPeriod: "DAILY",
      }),
    }));
  });
});

describe("getVitalsAnr", () => {
  it("queries vitals.anrrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsAnr(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.anrrate", expect.any(Object));
  });
});

describe("getVitalsStartup", () => {
  it("queries vitals.slowstartrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsStartup(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.slowstartrate", expect.any(Object));
  });
});

describe("getVitalsRendering", () => {
  it("queries vitals.slowrenderingrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsRendering(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.slowrenderingrate", expect.any(Object));
  });
});

describe("getVitalsBattery", () => {
  it("queries vitals.excessivewakeuprate", async () => {
    const reporting = mockReportingClient();
    await getVitalsBattery(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.excessivewakeuprate", expect.any(Object));
  });
});

describe("getVitalsMemory", () => {
  it("queries vitals.stuckbackgroundwakelockrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsMemory(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(PKG, "vitals.stuckbackgroundwakelockrate", expect.any(Object));
  });
});

describe("getVitalsAnomalies", () => {
  it("calls getAnomalies", async () => {
    const reporting = mockReportingClient();
    const result = await getVitalsAnomalies(reporting, PKG);
    expect(result).toEqual({ anomalies: [] });
    expect(reporting.getAnomalies).toHaveBeenCalledWith(PKG);
  });
});

describe("searchVitalsErrors", () => {
  it("calls searchErrorIssues with options", async () => {
    const reporting = mockReportingClient();
    await searchVitalsErrors(reporting, PKG, { filter: "crash", maxResults: 10 });
    expect(reporting.searchErrorIssues).toHaveBeenCalledWith(PKG, "crash", 10);
  });

  it("calls with no filter when none provided", async () => {
    const reporting = mockReportingClient();
    await searchVitalsErrors(reporting, PKG);
    expect(reporting.searchErrorIssues).toHaveBeenCalledWith(PKG, undefined, undefined);
  });
});

describe("checkThreshold", () => {
  it("returns breached=true when value exceeds threshold", () => {
    const result = checkThreshold(5.5, 5.0);
    expect(result.breached).toBe(true);
    expect(result.value).toBe(5.5);
    expect(result.threshold).toBe(5.0);
  });

  it("returns breached=false when value is below threshold", () => {
    const result = checkThreshold(3.0, 5.0);
    expect(result.breached).toBe(false);
  });

  it("returns breached=false when value equals threshold", () => {
    const result = checkThreshold(5.0, 5.0);
    expect(result.breached).toBe(false);
  });

  it("returns breached=false when value is undefined", () => {
    const result = checkThreshold(undefined, 5.0);
    expect(result.breached).toBe(false);
    expect(result.value).toBeUndefined();
  });
});
