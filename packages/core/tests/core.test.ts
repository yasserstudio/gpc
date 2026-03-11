import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock file validation so uploadRelease tests don't need real files
vi.mock("../src/utils/file-validation.js", () => ({
  validateUploadFile: vi.fn().mockResolvedValue({
    valid: true,
    fileType: "aab",
    sizeBytes: 1024,
    errors: [],
    warnings: [],
  }),
}));

// Mock image validation so uploadImage tests don't need real files
vi.mock("../src/utils/image-validation.js", () => ({
  validateImage: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
  }),
}));

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
import { listReviews, getReview, replyToReview, exportReviews } from "../src/commands/reviews.js";
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
      upload: vi.fn().mockResolvedValue({
        id: "img-1",
        url: "https://example.com/img.png",
        sha1: "a",
        sha256: "b",
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn(),
    },
    countryAvailability: {
      get: vi
        .fn()
        .mockResolvedValue({ countryTargeting: { countries: ["US"], includeRestOfWorld: false } }),
    },
    reviews: {
      list: vi.fn().mockResolvedValue({ reviews: [] }),
      get: vi.fn().mockResolvedValue({ reviewId: "r1", authorName: "User", comments: [] }),
      reply: vi
        .fn()
        .mockResolvedValue({ result: { replyText: "Thanks!", lastEdited: { seconds: "123" } } }),
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "internal",
      expect.objectContaining({
        versionCodes: ["42"],
        status: "completed",
      }),
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "inProgress",
        userFraction: 0.1,
      }),
    );
  });

  it("passes releaseNotes and releaseName to the track update", async () => {
    const client = mockClient();
    const notes = [{ language: "en-US", text: "Bug fixes" }];
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "beta",
      releaseNotes: notes,
      releaseName: "v2.0",
    });

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "beta",
      expect.objectContaining({
        releaseNotes: notes,
        name: "v2.0",
      }),
    );
  });

  it("deletes edit on error and rethrows", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("upload failed"));

    await expect(uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" })).rejects.toThrow(
      "upload failed",
    );

    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("suppresses delete failure when cleaning up after error", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("upload failed"));
    client.edits.delete.mockRejectedValue(new Error("delete also failed"));

    await expect(uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" })).rejects.toThrow(
      "upload failed",
    );
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
        releases: [{ versionCodes: ["10"], status: "completed" }],
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
    client.tracks.list.mockResolvedValue([{ track: "internal", releases: [] }, { track: "alpha" }]);

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
        {
          versionCodes: ["42"],
          status: "completed",
          releaseNotes: [{ language: "en-US", text: "notes" }],
        },
      ],
    });

    const result = await promoteRelease(client, PKG, "internal", "production");

    expect(client.tracks.get).toHaveBeenCalledWith(PKG, "edit-1", "internal");
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        versionCodes: ["42"],
        status: "completed",
        releaseNotes: [{ language: "en-US", text: "notes" }],
      }),
    );
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

    await expect(promoteRelease(client, PKG, "internal", "production")).rejects.toThrow(
      'No active release found on track "internal"',
    );
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("throws when source track has no releases at all", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({ track: "internal" });

    await expect(promoteRelease(client, PKG, "internal", "production")).rejects.toThrow(
      'No active release found on track "internal"',
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "inProgress",
        userFraction: 0.25,
      }),
    );
  });

  it("uses provided releaseNotes over source release notes", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [
        {
          versionCodes: ["42"],
          status: "completed",
          releaseNotes: [{ language: "en-US", text: "old" }],
        },
      ],
    });

    const newNotes = [{ language: "en-US", text: "new notes" }];
    await promoteRelease(client, PKG, "internal", "production", { releaseNotes: newNotes });

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        releaseNotes: newNotes,
      }),
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "inProgress",
        userFraction: 0.5,
      }),
    );
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("increase: throws when userFraction is not provided", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    await expect(updateRollout(client, PKG, "production", "increase")).rejects.toThrow(
      "--to <percentage> is required for rollout increase",
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "halted",
        userFraction: 0.3,
      }),
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "inProgress",
        userFraction: 0.3,
      }),
    );
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
    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        status: "completed",
      }),
    );
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

    await expect(updateRollout(client, PKG, "production", "halt")).rejects.toThrow(
      'No active rollout found on track "production"',
    );
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("throws when track has no releases", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({ track: "production" });

    await expect(updateRollout(client, PKG, "production", "halt")).rejects.toThrow(
      'No active rollout found on track "production"',
    );
  });

  it("preserves releaseNotes from current release", async () => {
    const client = mockClient();
    const notes = [{ language: "en-US", text: "fixes" }];
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [
        { versionCodes: ["42"], status: "inProgress", userFraction: 0.2, releaseNotes: notes },
      ],
    });

    await updateRollout(client, PKG, "production", "increase", 0.5);

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        releaseNotes: notes,
      }),
    );
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
    const local = [
      { language: "en-US", title: "New Title", shortDescription: "short", fullDescription: "full" },
    ];
    const remote = [
      { language: "en-US", title: "Old Title", shortDescription: "short", fullDescription: "full" },
    ];

    const diffs = diffListings(local, remote);

    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("title");
    expect(diffs[0].local).toBe("New Title");
    expect(diffs[0].remote).toBe("Old Title");
  });

  it("detects new languages (local only)", () => {
    const local = [
      { language: "fr-FR", title: "Bonjour", shortDescription: "s", fullDescription: "f" },
    ];
    const remote: any[] = [];

    const diffs = diffListings(local, remote);

    expect(diffs.length).toBeGreaterThanOrEqual(1);
    expect(diffs.every((d) => d.language === "fr-FR")).toBe(true);
    expect(diffs.every((d) => d.remote === "")).toBe(true);
  });

  it("detects remote-only languages", () => {
    const local: any[] = [];
    const remote = [
      { language: "de-DE", title: "Hallo", shortDescription: "s", fullDescription: "f" },
    ];

    const diffs = diffListings(local, remote);

    expect(diffs.length).toBeGreaterThanOrEqual(1);
    expect(diffs.every((d) => d.language === "de-DE")).toBe(true);
    expect(diffs.every((d) => d.local === "")).toBe(true);
  });

  it("returns empty array when local and remote match", () => {
    const listing = {
      language: "en-US",
      title: "Same",
      shortDescription: "same",
      fullDescription: "same",
    };
    const diffs = diffListings([listing], [{ ...listing }]);

    expect(diffs).toHaveLength(0);
  });
});

describe("writeListingsToDir / readListingsFromDir", () => {
  it("round-trips listings through the filesystem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-test-"));
    try {
      const listings = [
        {
          language: "en-US",
          title: "My App",
          shortDescription: "Short",
          fullDescription: "Full desc",
        },
        {
          language: "ja-JP",
          title: "My App JP",
          shortDescription: "Short JP",
          fullDescription: "Full JP",
        },
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
    const listing = {
      language: "en-US",
      title: "App",
      shortDescription: "s",
      fullDescription: "f",
    };
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
    const updated = {
      language: "en-US",
      title: "New",
      shortDescription: "s",
      fullDescription: "f",
    };
    client.listings.patch.mockResolvedValue(updated);

    const result = await updateListing(client, PKG, "en-US", { title: "New" });

    expect(result).toEqual(updated);
    expect(client.listings.patch).toHaveBeenCalledWith(PKG, "edit-1", "en-US", { title: "New" });
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("throws on invalid language code", async () => {
    const client = mockClient();
    await expect(updateListing(client, PKG, "bad", { title: "X" })).rejects.toThrow(
      "Invalid language tag",
    );
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
// diffListingsCommand
// ---------------------------------------------------------------------------
describe("diffListingsCommand", () => {
  it("returns diffs when local and remote differ", async () => {
    const client = mockClient();
    client.listings.list.mockResolvedValue([
      { language: "en-US", title: "Remote Title", shortDescription: "s", fullDescription: "f" },
    ]);

    const dir = await mkdtemp(join(tmpdir(), "gpc-diff-"));

    try {
      await writeListingsToDir(dir, [
        { language: "en-US", title: "Local Title", shortDescription: "s", fullDescription: "f" },
      ]);

      const { diffListingsCommand } = await import("../src/commands/listings.js");
      const diffs = await diffListingsCommand(client, PKG, dir);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        language: "en-US",
        field: "title",
        local: "Local Title",
        remote: "Remote Title",
      });
      expect(client.edits.insert).toHaveBeenCalledWith(PKG);
      expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns empty array when no differences", async () => {
    const client = mockClient();
    client.listings.list.mockResolvedValue([
      { language: "en-US", title: "Same", shortDescription: "s", fullDescription: "f" },
    ]);

    const dir = await mkdtemp(join(tmpdir(), "gpc-diff-"));

    try {
      await writeListingsToDir(dir, [
        { language: "en-US", title: "Same", shortDescription: "s", fullDescription: "f" },
      ]);

      const { diffListingsCommand } = await import("../src/commands/listings.js");
      const diffs = await diffListingsCommand(client, PKG, dir);

      expect(diffs).toHaveLength(0);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("detects remote-only language", async () => {
    const client = mockClient();
    client.listings.list.mockResolvedValue([
      { language: "ja-JP", title: "Japanese", shortDescription: "jp-s", fullDescription: "jp-f" },
    ]);

    const dir = await mkdtemp(join(tmpdir(), "gpc-diff-"));

    try {
      // Write no local listings — empty dir
      const { diffListingsCommand } = await import("../src/commands/listings.js");
      const diffs = await diffListingsCommand(client, PKG, dir);

      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.every((d) => d.language === "ja-JP")).toBe(true);
      expect(diffs.every((d) => d.local === "")).toBe(true);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("detects local-only language", async () => {
    const client = mockClient();
    client.listings.list.mockResolvedValue([]);

    const dir = await mkdtemp(join(tmpdir(), "gpc-diff-"));

    try {
      await writeListingsToDir(dir, [
        { language: "fr-FR", title: "Titre", shortDescription: "court", fullDescription: "complet" },
      ]);

      const { diffListingsCommand } = await import("../src/commands/listings.js");
      const diffs = await diffListingsCommand(client, PKG, dir);

      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.every((d) => d.language === "fr-FR")).toBe(true);
      expect(diffs.every((d) => d.remote === "")).toBe(true);
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

    expect(client.images.upload).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "en-US",
      "icon",
      "/tmp/icon.png",
    );
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
    expect(result).toHaveProperty("id");
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.images.upload.mockRejectedValue(new Error("upload fail"));

    await expect(uploadImage(client, PKG, "en-US", "icon", "/tmp/icon.png")).rejects.toThrow(
      "upload fail",
    );
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

    expect(client.images.delete).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "en-US",
      "phoneScreenshots",
      "img-1",
    );
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
    expect(client.details.patch).toHaveBeenCalledWith(PKG, "edit-1", {
      contactEmail: "test@example.com",
    });
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("deletes edit on error", async () => {
    const client = mockClient();
    client.details.patch.mockRejectedValue(new Error("details fail"));

    await expect(updateAppDetails(client, PKG, { contactEmail: "x" })).rejects.toThrow(
      "details fail",
    );
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 – Reviews
// ---------------------------------------------------------------------------

function makeReview(
  overrides: {
    reviewId?: string;
    starRating?: number;
    language?: string;
    seconds?: string;
    text?: string;
  } = {},
) {
  return {
    reviewId: overrides.reviewId ?? "r1",
    authorName: "User",
    comments: [
      {
        userComment: {
          text: overrides.text ?? "Great app!",
          lastModified: { seconds: overrides.seconds ?? "1700000000" },
          starRating: overrides.starRating ?? 5,
          reviewerLanguage: overrides.language ?? "en",
        },
      },
    ],
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

    expect(client.reviews.list).toHaveBeenCalledWith(
      PKG,
      expect.objectContaining({
        translationLanguage: "fr",
      }),
    );
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
    await expect(replyToReview(client, PKG, "r1", longText)).rejects.toThrow(
      "exceeds 350 characters",
    );
  });

  it("throws when reply is empty", async () => {
    const client = mockClient();
    await expect(replyToReview(client, PKG, "r1", "")).rejects.toThrow("cannot be empty");
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
    expect(lines[0]).toBe(
      "reviewId,authorName,starRating,text,language,date,device,appVersionName",
    );
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
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.crashrate",
      expect.any(Object),
    );
  });

  it("passes dimension option", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG, { dimension: "versionCode" });
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.crashrate",
      expect.objectContaining({
        dimensions: ["versionCode"],
      }),
    );
  });

  it("passes days option as timeline spec", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG, { days: 7 });
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.crashrate",
      expect.objectContaining({
        timelineSpec: expect.objectContaining({
          aggregationPeriod: "DAILY",
        }),
      }),
    );
  });
});

describe("getVitalsAnr", () => {
  it("queries vitals.anrrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsAnr(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.anrrate",
      expect.any(Object),
    );
  });
});

describe("getVitalsStartup", () => {
  it("queries vitals.slowstartrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsStartup(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.slowstartrate",
      expect.any(Object),
    );
  });
});

describe("getVitalsRendering", () => {
  it("queries vitals.slowrenderingrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsRendering(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.slowrenderingrate",
      expect.any(Object),
    );
  });
});

describe("getVitalsBattery", () => {
  it("queries vitals.excessivewakeuprate", async () => {
    const reporting = mockReportingClient();
    await getVitalsBattery(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.excessivewakeuprate",
      expect.any(Object),
    );
  });
});

describe("getVitalsMemory", () => {
  it("queries vitals.stuckbackgroundwakelockrate", async () => {
    const reporting = mockReportingClient();
    await getVitalsMemory(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "vitals.stuckbackgroundwakelockrate",
      expect.any(Object),
    );
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

// ---------------------------------------------------------------------------
// Phase 6 – Subscriptions
// ---------------------------------------------------------------------------

import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  activateBasePlan,
  deactivateBasePlan,
  deleteBasePlan,
  migratePrices,
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
} from "../src/commands/subscriptions.js";

describe("subscriptions commands", () => {
  function mockClient(): any {
    return {
      subscriptions: {
        list: vi.fn().mockResolvedValue({ subscriptions: [{ productId: "sub1" }] }),
        get: vi.fn().mockResolvedValue({ productId: "sub1" }),
        create: vi.fn().mockResolvedValue({ productId: "sub1" }),
        update: vi.fn().mockResolvedValue({ productId: "sub1" }),
        delete: vi.fn().mockResolvedValue(undefined),
        activateBasePlan: vi.fn().mockResolvedValue({ productId: "sub1" }),
        deactivateBasePlan: vi.fn().mockResolvedValue({ productId: "sub1" }),
        deleteBasePlan: vi.fn().mockResolvedValue(undefined),
        migratePrices: vi.fn().mockResolvedValue({ productId: "sub1" }),
        listOffers: vi.fn().mockResolvedValue({ subscriptionOffers: [] }),
        getOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        createOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        updateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        deleteOffer: vi.fn().mockResolvedValue(undefined),
        activateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        deactivateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
      },
    };
  }

  it("listSubscriptions calls client.subscriptions.list", async () => {
    const client = mockClient();
    const result = await listSubscriptions(client, "com.example");
    expect(client.subscriptions.list).toHaveBeenCalledWith("com.example", {
      pageToken: undefined,
      pageSize: undefined,
    });
    expect(result.subscriptions).toHaveLength(1);
  });

  it("getSubscription calls client.subscriptions.get", async () => {
    const client = mockClient();
    const result = await getSubscription(client, "com.example", "sub1");
    expect(client.subscriptions.get).toHaveBeenCalledWith("com.example", "sub1");
    expect(result.productId).toBe("sub1");
  });

  it("createSubscription calls client.subscriptions.create", async () => {
    const client = mockClient();
    const data = { productId: "sub1" } as any;
    await createSubscription(client, "com.example", data);
    expect(client.subscriptions.create).toHaveBeenCalledWith("com.example", data);
  });

  it("updateSubscription passes updateMask", async () => {
    const client = mockClient();
    const data = { productId: "sub1" } as any;
    await updateSubscription(client, "com.example", "sub1", data, "listings");
    expect(client.subscriptions.update).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      data,
      "listings",
    );
  });

  it("deleteSubscription calls client.subscriptions.delete", async () => {
    const client = mockClient();
    await deleteSubscription(client, "com.example", "sub1");
    expect(client.subscriptions.delete).toHaveBeenCalledWith("com.example", "sub1");
  });

  it("activateBasePlan calls client.subscriptions.activateBasePlan", async () => {
    const client = mockClient();
    await activateBasePlan(client, "com.example", "sub1", "bp1");
    expect(client.subscriptions.activateBasePlan).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
    );
  });

  it("deactivateBasePlan calls client.subscriptions.deactivateBasePlan", async () => {
    const client = mockClient();
    await deactivateBasePlan(client, "com.example", "sub1", "bp1");
    expect(client.subscriptions.deactivateBasePlan).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
    );
  });

  it("deleteBasePlan calls client.subscriptions.deleteBasePlan", async () => {
    const client = mockClient();
    await deleteBasePlan(client, "com.example", "sub1", "bp1");
    expect(client.subscriptions.deleteBasePlan).toHaveBeenCalledWith("com.example", "sub1", "bp1");
  });

  it("listOffers calls client.subscriptions.listOffers", async () => {
    const client = mockClient();
    const result = await listOffers(client, "com.example", "sub1", "bp1");
    expect(client.subscriptions.listOffers).toHaveBeenCalledWith("com.example", "sub1", "bp1");
    expect(result.subscriptionOffers).toEqual([]);
  });

  it("createOffer calls client.subscriptions.createOffer", async () => {
    const client = mockClient();
    const data = { offerId: "o1" } as any;
    await createOffer(client, "com.example", "sub1", "bp1", data);
    expect(client.subscriptions.createOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      data,
    );
  });

  it("deleteOffer calls client.subscriptions.deleteOffer", async () => {
    const client = mockClient();
    await deleteOffer(client, "com.example", "sub1", "bp1", "o1");
    expect(client.subscriptions.deleteOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
    );
  });

  it("activateOffer calls client.subscriptions.activateOffer", async () => {
    const client = mockClient();
    await activateOffer(client, "com.example", "sub1", "bp1", "o1");
    expect(client.subscriptions.activateOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – In-App Products
// ---------------------------------------------------------------------------

import {
  listInAppProducts,
  getInAppProduct,
  createInAppProduct,
  updateInAppProduct,
  deleteInAppProduct,
  syncInAppProducts,
} from "../src/commands/iap.js";
import { writeFile, mkdir } from "node:fs/promises";

describe("iap commands", () => {
  function mockClient(): any {
    return {
      inappproducts: {
        list: vi.fn().mockResolvedValue({ inappproduct: [] }),
        get: vi.fn().mockResolvedValue({ sku: "coins100" }),
        create: vi.fn().mockResolvedValue({ sku: "coins100" }),
        update: vi.fn().mockResolvedValue({ sku: "coins100" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("listInAppProducts calls client.inappproducts.list", async () => {
    const client = mockClient();
    const result = await listInAppProducts(client, "com.example");
    expect(client.inappproducts.list).toHaveBeenCalledWith("com.example", {
      token: undefined,
      maxResults: undefined,
    });
    expect(result.inappproduct).toEqual([]);
  });

  it("getInAppProduct calls client.inappproducts.get", async () => {
    const client = mockClient();
    const result = await getInAppProduct(client, "com.example", "coins100");
    expect(client.inappproducts.get).toHaveBeenCalledWith("com.example", "coins100");
    expect(result.sku).toBe("coins100");
  });

  it("createInAppProduct calls client.inappproducts.create", async () => {
    const client = mockClient();
    const data = { sku: "coins100" } as any;
    await createInAppProduct(client, "com.example", data);
    expect(client.inappproducts.create).toHaveBeenCalledWith("com.example", data);
  });

  it("updateInAppProduct calls client.inappproducts.update", async () => {
    const client = mockClient();
    const data = { sku: "coins100" } as any;
    await updateInAppProduct(client, "com.example", "coins100", data);
    expect(client.inappproducts.update).toHaveBeenCalledWith("com.example", "coins100", data);
  });

  it("deleteInAppProduct calls client.inappproducts.delete", async () => {
    const client = mockClient();
    await deleteInAppProduct(client, "com.example", "coins100");
    expect(client.inappproducts.delete).toHaveBeenCalledWith("com.example", "coins100");
  });

  it("syncInAppProducts creates new products and updates existing ones", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-iap-"));
    await writeFile(
      join(dir, "coins100.json"),
      JSON.stringify({
        sku: "coins100",
        status: "active",
        purchaseType: "managedUser",
        defaultPrice: { currencyCode: "USD", units: "1" },
      }),
    );
    await writeFile(
      join(dir, "gems50.json"),
      JSON.stringify({
        sku: "gems50",
        status: "active",
        purchaseType: "managedUser",
        defaultPrice: { currencyCode: "USD", units: "2" },
      }),
    );

    const client = mockClient();
    client.inappproducts.list.mockResolvedValue({ inappproduct: [{ sku: "coins100" }] });

    const result = await syncInAppProducts(client, "com.example", dir);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skus).toContain("coins100");
    expect(result.skus).toContain("gems50");
    expect(client.inappproducts.update).toHaveBeenCalledTimes(1);
    expect(client.inappproducts.create).toHaveBeenCalledTimes(1);

    await rm(dir, { recursive: true });
  });

  it("syncInAppProducts dry-run does not call create or update", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-iap-"));
    await writeFile(join(dir, "coins100.json"), JSON.stringify({ sku: "coins100" }));

    const client = mockClient();
    const result = await syncInAppProducts(client, "com.example", dir, { dryRun: true });

    expect(result.created).toBe(1);
    expect(client.inappproducts.create).not.toHaveBeenCalled();
    expect(client.inappproducts.update).not.toHaveBeenCalled();

    await rm(dir, { recursive: true });
  });

  it("syncInAppProducts returns zeros for empty directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-iap-"));

    const client = mockClient();
    const result = await syncInAppProducts(client, "com.example", dir);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skus).toEqual([]);

    await rm(dir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – Purchases
// ---------------------------------------------------------------------------

import {
  getProductPurchase,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  deferSubscriptionPurchase,
  revokeSubscriptionPurchase,
  listVoidedPurchases,
  refundOrder,
} from "../src/commands/purchases.js";

describe("purchases commands", () => {
  function mockClient(): any {
    return {
      purchases: {
        getProduct: vi.fn().mockResolvedValue({ purchaseState: 0, orderId: "o1" }),
        acknowledgeProduct: vi.fn().mockResolvedValue(undefined),
        consumeProduct: vi.fn().mockResolvedValue(undefined),
        getSubscriptionV2: vi
          .fn()
          .mockResolvedValue({ subscriptionState: "ACTIVE", lineItems: [] }),
        getSubscriptionV1: vi.fn().mockResolvedValue({
          expiryTimeMillis: "100000",
          orderId: "o1",
          autoRenewing: true,
          startTimeMillis: "1",
        }),
        cancelSubscription: vi.fn().mockResolvedValue(undefined),
        deferSubscription: vi.fn().mockResolvedValue({ newExpiryTimeMillis: "200000" }),
        revokeSubscriptionV2: vi.fn().mockResolvedValue(undefined),
        listVoided: vi.fn().mockResolvedValue({ voidedPurchases: [] }),
      },
      orders: {
        refund: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("getProductPurchase calls client.purchases.getProduct", async () => {
    const client = mockClient();
    const result = await getProductPurchase(client, "com.example", "coins100", "tok");
    expect(client.purchases.getProduct).toHaveBeenCalledWith("com.example", "coins100", "tok");
    expect(result.orderId).toBe("o1");
  });

  it("acknowledgeProductPurchase calls with payload", async () => {
    const client = mockClient();
    await acknowledgeProductPurchase(client, "com.example", "coins100", "tok", "payload1");
    expect(client.purchases.acknowledgeProduct).toHaveBeenCalledWith(
      "com.example",
      "coins100",
      "tok",
      { developerPayload: "payload1" },
    );
  });

  it("consumeProductPurchase calls client.purchases.consumeProduct", async () => {
    const client = mockClient();
    await consumeProductPurchase(client, "com.example", "coins100", "tok");
    expect(client.purchases.consumeProduct).toHaveBeenCalledWith("com.example", "coins100", "tok");
  });

  it("getSubscriptionPurchase calls v2 endpoint", async () => {
    const client = mockClient();
    const result = await getSubscriptionPurchase(client, "com.example", "tok");
    expect(client.purchases.getSubscriptionV2).toHaveBeenCalledWith("com.example", "tok");
    expect(result.subscriptionState).toBe("ACTIVE");
  });

  it("cancelSubscriptionPurchase calls v1 cancel", async () => {
    const client = mockClient();
    await cancelSubscriptionPurchase(client, "com.example", "sub1", "tok");
    expect(client.purchases.cancelSubscription).toHaveBeenCalledWith("com.example", "sub1", "tok");
  });

  it("deferSubscriptionPurchase reads v1 expiry then defers", async () => {
    const client = mockClient();
    const result = await deferSubscriptionPurchase(
      client,
      "com.example",
      "sub1",
      "tok",
      "2025-12-31T00:00:00Z",
    );
    expect(client.purchases.getSubscriptionV1).toHaveBeenCalledWith("com.example", "sub1", "tok");
    expect(client.purchases.deferSubscription).toHaveBeenCalled();
    const deferCall = client.purchases.deferSubscription.mock.calls[0];
    expect(deferCall[3].deferralInfo.expectedExpiryTimeMillis).toBe("100000");
    expect(result.newExpiryTimeMillis).toBe("200000");
  });

  it("revokeSubscriptionPurchase calls v2 revoke", async () => {
    const client = mockClient();
    await revokeSubscriptionPurchase(client, "com.example", "tok");
    expect(client.purchases.revokeSubscriptionV2).toHaveBeenCalledWith("com.example", "tok");
  });

  it("listVoidedPurchases calls client.purchases.listVoided", async () => {
    const client = mockClient();
    const result = await listVoidedPurchases(client, "com.example");
    expect(client.purchases.listVoided).toHaveBeenCalledWith("com.example", undefined);
    expect(result.voidedPurchases).toEqual([]);
  });

  it("refundOrder calls client.orders.refund", async () => {
    const client = mockClient();
    await refundOrder(client, "com.example", "GPA.1234", { fullRefund: true });
    expect(client.orders.refund).toHaveBeenCalledWith("com.example", "GPA.1234", {
      fullRefund: true,
    });
  });
});

// ---------------------------------------------------------------------------
// App Recovery
// ---------------------------------------------------------------------------

import {
  listRecoveryActions,
  cancelRecoveryAction,
  deployRecoveryAction,
} from "../src/commands/app-recovery.js";

describe("app recovery commands", () => {
  function mockClient(): any {
    return {
      appRecovery: {
        list: vi.fn().mockResolvedValue([
          { appRecoveryId: "rec1", status: "DRAFT", createTime: "2026-01-01T00:00:00Z" },
          { appRecoveryId: "rec2", status: "DEPLOYED", deployTime: "2026-02-01T00:00:00Z" },
        ]),
        cancel: vi.fn().mockResolvedValue(undefined),
        deploy: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("listRecoveryActions calls client.appRecovery.list", async () => {
    const client = mockClient();
    const result = await listRecoveryActions(client, "com.example");
    expect(client.appRecovery.list).toHaveBeenCalledWith("com.example");
    expect(result).toHaveLength(2);
    expect(result[0].appRecoveryId).toBe("rec1");
    expect(result[1].status).toBe("DEPLOYED");
  });

  it("cancelRecoveryAction calls client.appRecovery.cancel", async () => {
    const client = mockClient();
    await cancelRecoveryAction(client, "com.example", "rec1");
    expect(client.appRecovery.cancel).toHaveBeenCalledWith("com.example", "rec1");
  });

  it("deployRecoveryAction calls client.appRecovery.deploy", async () => {
    const client = mockClient();
    await deployRecoveryAction(client, "com.example", "rec2");
    expect(client.appRecovery.deploy).toHaveBeenCalledWith("com.example", "rec2");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 – Pricing
// ---------------------------------------------------------------------------

import { convertRegionPrices } from "../src/commands/pricing.js";

describe("pricing commands", () => {
  it("convertRegionPrices constructs Money from currency and amount", async () => {
    const client: any = {
      monetization: {
        convertRegionPrices: vi.fn().mockResolvedValue({ convertedRegionPrices: {} }),
      },
    };

    await convertRegionPrices(client, "com.example", "USD", "4.99");
    const call = client.monetization.convertRegionPrices.mock.calls[0];
    expect(call[0]).toBe("com.example");
    expect(call[1].price.currencyCode).toBe("USD");
    expect(call[1].price.units).toBe("4");
    expect(call[1].price.nanos).toBe(990000000);
  });
});

// ---------------------------------------------------------------------------
// Phase 7 – Reports
// ---------------------------------------------------------------------------

import {
  listReports,
  downloadReport,
  parseMonth,
  isValidReportType,
  isFinancialReportType,
  isStatsReportType,
  isValidStatsDimension,
} from "../src/commands/reports.js";

describe("report commands", () => {
  it("parseMonth parses valid YYYY-MM format", () => {
    const result = parseMonth("2026-03");
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("parseMonth throws on invalid format", () => {
    expect(() => parseMonth("2026-3")).toThrow("Invalid month format");
    expect(() => parseMonth("2026")).toThrow("Invalid month format");
    expect(() => parseMonth("03-2026")).toThrow("Invalid month format");
  });

  it("parseMonth throws on invalid month number", () => {
    expect(() => parseMonth("2026-13")).toThrow("Invalid month");
    expect(() => parseMonth("2026-00")).toThrow("Invalid month");
  });

  it("isValidReportType accepts valid types", () => {
    expect(isValidReportType("earnings")).toBe(true);
    expect(isValidReportType("installs")).toBe(true);
    expect(isValidReportType("invalid")).toBe(false);
  });

  it("isFinancialReportType identifies financial types", () => {
    expect(isFinancialReportType("earnings")).toBe(true);
    expect(isFinancialReportType("sales")).toBe(true);
    expect(isFinancialReportType("installs")).toBe(false);
  });

  it("isStatsReportType identifies stats types", () => {
    expect(isStatsReportType("installs")).toBe(true);
    expect(isStatsReportType("crashes")).toBe(true);
    expect(isStatsReportType("earnings")).toBe(false);
  });

  it("isValidStatsDimension validates dimensions", () => {
    expect(isValidStatsDimension("country")).toBe(true);
    expect(isValidStatsDimension("bogus")).toBe(false);
  });

  it("listReports calls client.reports.list and returns buckets", async () => {
    const buckets = [{ bucketId: "b1", uri: "https://storage.googleapis.com/r.csv" }];
    const client: any = {
      reports: {
        list: vi.fn().mockResolvedValue({ reports: buckets }),
      },
    };
    const result = await listReports(client, "com.example", "earnings", 2026, 3);
    expect(result).toEqual(buckets);
    expect(client.reports.list).toHaveBeenCalledWith("com.example", "earnings", 2026, 3);
  });

  it("listReports returns empty array when no reports", async () => {
    const client: any = {
      reports: { list: vi.fn().mockResolvedValue({ reports: undefined }) },
    };
    const result = await listReports(client, "com.example", "earnings", 2026, 3);
    expect(result).toEqual([]);
  });

  it("downloadReport fetches CSV from signed URI", async () => {
    const client: any = {
      reports: {
        list: vi.fn().mockResolvedValue({
          reports: [{ bucketId: "b1", uri: "https://storage.example.com/r.csv" }],
        }),
      },
    };
    const originalFetch = globalThis.fetch;
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response("col1,col2\nval1,val2", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    try {
      const csv = await downloadReport(client, "com.example", "earnings", 2026, 3);
      expect(csv).toBe("col1,col2\nval1,val2");
      expect(mockFetch).toHaveBeenCalledWith("https://storage.example.com/r.csv");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("downloadReport throws when no reports found", async () => {
    const client: any = {
      reports: { list: vi.fn().mockResolvedValue({ reports: [] }) },
    };
    await expect(downloadReport(client, "com.example", "earnings", 2026, 3)).rejects.toThrow(
      "No earnings reports found",
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 7 – Users
// ---------------------------------------------------------------------------

import {
  listUsers,
  getUser,
  inviteUser,
  updateUser,
  removeUser,
  parseGrantArg,
  PERMISSION_PROPAGATION_WARNING,
} from "../src/commands/users.js";

describe("user commands", () => {
  function mockUsersClient(): any {
    return {
      list: vi.fn().mockResolvedValue({ users: [{ email: "a@b.com" }] }),
      get: vi.fn().mockResolvedValue({ email: "a@b.com", name: "Alice" }),
      create: vi.fn().mockResolvedValue({ email: "new@b.com" }),
      update: vi.fn().mockResolvedValue({ email: "a@b.com" }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("listUsers returns users object", async () => {
    const client = mockUsersClient();
    const result = await listUsers(client, "12345");
    expect(result.users).toEqual([{ email: "a@b.com" }]);
    expect(client.list).toHaveBeenCalledWith("12345", undefined);
  });

  it("listUsers returns empty when no users", async () => {
    const client = mockUsersClient();
    client.list.mockResolvedValue({ users: undefined });
    const result = await listUsers(client, "12345");
    expect(result.users).toEqual([]);
  });

  it("getUser delegates to client.get", async () => {
    const client = mockUsersClient();
    const result = await getUser(client, "12345", "a@b.com");
    expect(result.email).toBe("a@b.com");
    expect(client.get).toHaveBeenCalledWith("12345", "a@b.com");
  });

  it("inviteUser creates user with email and permissions", async () => {
    const client = mockUsersClient();
    await inviteUser(client, "12345", "new@b.com", ["ADMIN"]);
    const call = client.create.mock.calls[0];
    expect(call[0]).toBe("12345");
    expect(call[1].email).toBe("new@b.com");
    expect(call[1].developerAccountPermission).toEqual(["ADMIN"]);
  });

  it("inviteUser passes grants when provided", async () => {
    const client = mockUsersClient();
    const grants = [
      { packageName: "com.example", appLevelPermissions: ["CAN_MANAGE_PUBLIC_APKS" as const] },
    ];
    await inviteUser(client, "12345", "new@b.com", undefined, grants);
    const call = client.create.mock.calls[0];
    expect(call[1].grants).toEqual(grants);
  });

  it("updateUser sends updateMask with changed fields", async () => {
    const client = mockUsersClient();
    await updateUser(client, "12345", "a@b.com", ["CAN_VIEW_FINANCIAL_DATA"]);
    expect(client.update).toHaveBeenCalledWith(
      "12345",
      "a@b.com",
      { developerAccountPermission: ["CAN_VIEW_FINANCIAL_DATA"] },
      "developerAccountPermission",
    );
  });

  it("updateUser includes grants in updateMask", async () => {
    const client = mockUsersClient();
    const grants = [{ packageName: "com.example", appLevelPermissions: ["ADMIN" as const] }];
    await updateUser(client, "12345", "a@b.com", ["ADMIN"], grants);
    expect(client.update).toHaveBeenCalledWith(
      "12345",
      "a@b.com",
      { developerAccountPermission: ["ADMIN"], grants },
      "developerAccountPermission,grants",
    );
  });

  it("removeUser delegates to client.delete", async () => {
    const client = mockUsersClient();
    await removeUser(client, "12345", "a@b.com");
    expect(client.delete).toHaveBeenCalledWith("12345", "a@b.com");
  });

  it("parseGrantArg parses package:permission format", () => {
    const grant = parseGrantArg("com.example:ADMIN,CAN_VIEW_FINANCIAL_DATA");
    expect(grant.packageName).toBe("com.example");
    expect(grant.appLevelPermissions).toEqual(["ADMIN", "CAN_VIEW_FINANCIAL_DATA"]);
  });

  it("parseGrantArg throws on invalid format", () => {
    expect(() => parseGrantArg("com.example")).toThrow("Invalid grant format");
  });

  it("PERMISSION_PROPAGATION_WARNING is defined", () => {
    expect(PERMISSION_PROPAGATION_WARNING).toContain("48 hours");
  });
});

// ---------------------------------------------------------------------------
// Phase 7 – Testers
// ---------------------------------------------------------------------------

import {
  listTesters,
  addTesters,
  removeTesters,
  importTestersFromCsv,
} from "../src/commands/testers.js";

describe("tester commands", () => {
  function mockClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1" }),
        validate: vi.fn().mockResolvedValue({}),
        commit: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      testers: {
        get: vi
          .fn()
          .mockResolvedValue({ googleGroups: ["existing@example.com"], googleGroupsCount: 1 }),
        update: vi.fn().mockImplementation((_pkg, _editId, _track, data) => Promise.resolve(data)),
      },
    };
  }

  it("listTesters opens edit, reads testers, deletes edit", async () => {
    const client = mockClient();
    const result = await listTesters(client, "com.example", "internal");
    expect(result.googleGroups).toEqual(["existing@example.com"]);
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.testers.get).toHaveBeenCalledWith("com.example", "edit-1", "internal");
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
  });

  it("addTesters merges new emails with existing", async () => {
    const client = mockClient();
    const result = await addTesters(client, "com.example", "internal", ["new@example.com"]);
    expect(result.googleGroups).toContain("existing@example.com");
    expect(result.googleGroups).toContain("new@example.com");
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("addTesters deduplicates emails", async () => {
    const client = mockClient();
    const result = await addTesters(client, "com.example", "internal", ["existing@example.com"]);
    expect(result.googleGroups).toEqual(["existing@example.com"]);
  });

  it("removeTesters filters out specified emails", async () => {
    const client = mockClient();
    const result = await removeTesters(client, "com.example", "internal", ["existing@example.com"]);
    expect(result.googleGroups).toEqual([]);
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("removeTesters keeps non-matching emails", async () => {
    const client = mockClient();
    const result = await removeTesters(client, "com.example", "internal", ["other@example.com"]);
    expect(result.googleGroups).toEqual(["existing@example.com"]);
  });

  it("addTesters cleans up edit on error", async () => {
    const client = mockClient();
    client.testers.get.mockRejectedValue(new Error("API error"));
    await expect(addTesters(client, "com.example", "internal", ["a@b.com"])).rejects.toThrow(
      "API error",
    );
    expect(client.edits.delete).toHaveBeenCalled();
  });

  it("importTestersFromCsv reads file and adds testers", async () => {
    const client = mockClient();
    const { writeFile } = await import("node:fs/promises");
    const dir = await mkdtemp(join(tmpdir(), "gpc-testers-"));
    const csvPath = join(dir, "testers.csv");
    await writeFile(csvPath, "a@example.com,b@example.com\nc@example.com");

    try {
      const result = await importTestersFromCsv(client, "com.example", "internal", csvPath);
      expect(result.added).toBe(3);
      expect(result.testers.googleGroups).toContain("a@example.com");
      expect(result.testers.googleGroups).toContain("b@example.com");
      expect(result.testers.googleGroups).toContain("c@example.com");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("importTestersFromCsv throws if no valid emails found", async () => {
    const client = mockClient();
    const { writeFile } = await import("node:fs/promises");
    const dir = await mkdtemp(join(tmpdir(), "gpc-testers-"));
    const csvPath = join(dir, "bad.csv");
    await writeFile(csvPath, "not-an-email\nanother-bad");

    try {
      await expect(
        importTestersFromCsv(client, "com.example", "internal", csvPath),
      ).rejects.toThrow("No valid email addresses");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 8 – Plugin System
// ---------------------------------------------------------------------------

import { PluginManager, discoverPlugins } from "../src/plugins.js";
import type { GpcPlugin } from "@gpc-cli/plugin-sdk";

describe("PluginManager", () => {
  it("loads a plugin and tracks it", async () => {
    const manager = new PluginManager();
    const plugin: GpcPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      register() {},
    };
    await manager.load(plugin);
    const loaded = manager.getLoadedPlugins();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.name).toBe("test-plugin");
    expect(loaded[0]!.version).toBe("1.0.0");
  });

  it("marks @gpc-cli/* plugins as trusted", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "@gpc-cli/plugin-ci",
      version: "0.8.0",
      register() {},
    });
    expect(manager.getLoadedPlugins()[0]!.trusted).toBe(true);
  });

  it("marks third-party plugins as untrusted", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "gpc-plugin-slack",
      version: "1.0.0",
      register() {},
    });
    expect(manager.getLoadedPlugins()[0]!.trusted).toBe(false);
  });

  it("runs beforeCommand handlers in order", async () => {
    const manager = new PluginManager();
    const order: number[] = [];
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeCommand(async () => {
          order.push(1);
        });
      },
    });
    await manager.load({
      name: "p2",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeCommand(async () => {
          order.push(2);
        });
      },
    });

    await manager.runBeforeCommand({
      command: "releases upload",
      args: {},
      startedAt: new Date(),
    });
    expect(order).toEqual([1, 2]);
  });

  it("runs afterCommand handlers with result", async () => {
    const manager = new PluginManager();
    let receivedResult: any;
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.afterCommand(async (_ctx, result) => {
          receivedResult = result;
        });
      },
    });

    const event = { command: "apps info", args: {}, startedAt: new Date() };
    const result = { success: true, durationMs: 100, exitCode: 0, data: { app: "com.example" } };
    await manager.runAfterCommand(event, result);
    expect(receivedResult).toEqual(result);
  });

  it("runs onError handlers and swallows handler errors", async () => {
    const manager = new PluginManager();
    let receivedError: any;
    await manager.load({
      name: "crash-handler",
      version: "1.0.0",
      register(hooks) {
        hooks.onError(async () => {
          throw new Error("handler crashed");
        });
      },
    });
    await manager.load({
      name: "good-handler",
      version: "1.0.0",
      register(hooks) {
        hooks.onError(async (_ctx, err) => {
          receivedError = err;
        });
      },
    });

    const event = { command: "releases upload", args: {}, startedAt: new Date() };
    const error = { code: "API_FORBIDDEN", message: "denied", exitCode: 4 };
    // Should not throw even though first handler crashes
    await manager.runOnError(event, error);
    expect(receivedError).toEqual(error);
  });

  it("collects commands registered by plugins", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.registerCommands((registry) => {
          registry.add({
            name: "deploy",
            description: "Deploy the app",
            action: async () => {},
          });
          registry.add({
            name: "rollback",
            description: "Rollback deployment",
            action: async () => {},
          });
        });
      },
    });

    const cmds = manager.getRegisteredCommands();
    expect(cmds).toHaveLength(2);
    expect(cmds[0]!.name).toBe("deploy");
    expect(cmds[1]!.name).toBe("rollback");
  });

  it("reset clears all state", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeCommand(async () => {});
        hooks.registerCommands((r) =>
          r.add({ name: "x", description: "x", action: async () => {} }),
        );
      },
    });

    expect(manager.getLoadedPlugins()).toHaveLength(1);
    expect(manager.getRegisteredCommands()).toHaveLength(1);

    manager.reset();
    expect(manager.getLoadedPlugins()).toHaveLength(0);
    expect(manager.getRegisteredCommands()).toHaveLength(0);
  });

  it("rejects invalid permissions for untrusted plugins", async () => {
    const manager = new PluginManager();
    await expect(
      manager.load(
        { name: "bad-plugin", version: "1.0.0", register() {} },
        { name: "bad-plugin", version: "1.0.0", permissions: ["invalid:perm" as any] },
      ),
    ).rejects.toThrow("Unknown plugin permission");
  });

  it("allows any permissions for trusted plugins", async () => {
    const manager = new PluginManager();
    // Should not throw — trusted plugins skip permission validation
    await manager.load(
      { name: "@gpc-cli/plugin-ci", version: "0.8.0", register() {} },
      { name: "@gpc-cli/plugin-ci", version: "0.8.0", trusted: true, permissions: ["api:write"] },
    );
    expect(manager.getLoadedPlugins()).toHaveLength(1);
  });

  it("supports async register functions", async () => {
    const manager = new PluginManager();
    let registered = false;
    await manager.load({
      name: "async-plugin",
      version: "1.0.0",
      async register(hooks) {
        await new Promise((r) => setTimeout(r, 1));
        hooks.beforeCommand(async () => {});
        registered = true;
      },
    });
    expect(registered).toBe(true);
  });
});

describe("discoverPlugins", () => {
  it("returns empty array when no config plugins", async () => {
    const plugins = await discoverPlugins();
    expect(plugins).toEqual([]);
  });

  it("returns empty array for non-existent plugin modules", async () => {
    const plugins = await discoverPlugins({ configPlugins: ["nonexistent-plugin-xyz"] });
    expect(plugins).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 9 – error unification
// ---------------------------------------------------------------------------
describe("error unification", () => {
  it("GpcError has toJSON()", () => {
    const err = new GpcError("unified", "UNI_CODE", 2, "see docs");
    const json = err.toJSON();
    expect(json).toEqual({
      success: false,
      error: {
        code: "UNI_CODE",
        message: "unified",
        suggestion: "see docs",
      },
    });
  });

  it("ApiError (from @gpc-cli/core) has exitCode 4", () => {
    const err = new ApiError("api fail", "API_FAIL", 500);
    expect(err.exitCode).toBe(4);
    expect(err).toBeInstanceOf(GpcError);
  });

  it("NetworkError has exitCode 5", () => {
    const err = new NetworkError("connection refused");
    expect(err.exitCode).toBe(5);
    expect(err).toBeInstanceOf(GpcError);
  });

  it("ConfigError has exitCode 1", () => {
    const err = new ConfigError("bad config", "BAD_CFG");
    expect(err.exitCode).toBe(1);
    expect(err).toBeInstanceOf(GpcError);
  });
});

// ---------------------------------------------------------------------------
// Additional output.ts coverage
// ---------------------------------------------------------------------------
describe("formatOutput – additional coverage", () => {
  it("unknown format falls through to JSON", () => {
    const data = { key: "value" };
    const result = formatOutput(data, "unknown-format" as any);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("yaml with null returns 'null'", () => {
    const result = formatOutput(null, "yaml");
    expect(result).toBe("null");
  });

  it("yaml with undefined returns 'null'", () => {
    const result = formatOutput(undefined, "yaml");
    expect(result).toBe("null");
  });

  it("yaml with array of objects formats nested YAML", () => {
    const data = [
      { name: "alpha", count: 1 },
      { name: "beta", count: 2 },
    ];
    const result = formatOutput(data, "yaml");
    expect(result).toContain("name: alpha");
    expect(result).toContain("count: 1");
    expect(result).toContain("name: beta");
    expect(result).toContain("count: 2");
    // Array items are prefixed with "- "
    expect(result).toContain("-");
  });

  it("yaml with nested objects", () => {
    const data = { outer: { inner: "deep" } };
    const result = formatOutput(data, "yaml");
    expect(result).toContain("outer:");
    expect(result).toContain("inner: deep");
  });

  it("yaml with array of primitives", () => {
    const data = [1, 2, 3];
    const result = formatOutput(data, "yaml");
    expect(result).toContain("- 1");
    expect(result).toContain("- 2");
    expect(result).toContain("- 3");
  });

  it("yaml with boolean values", () => {
    const data = { enabled: true, disabled: false };
    const result = formatOutput(data, "yaml");
    expect(result).toContain("enabled: true");
    expect(result).toContain("disabled: false");
  });

  it("yaml with empty object returns '{}'", () => {
    const result = formatOutput({}, "yaml");
    expect(result).toBe("{}");
  });

  it("yaml with empty array returns '[]'", () => {
    const result = formatOutput([], "yaml");
    expect(result).toBe("[]");
  });

  it("yaml with multiline string uses block scalar", () => {
    const data = { text: "line1\nline2\nline3" };
    const result = formatOutput(data, "yaml");
    expect(result).toContain("text: |");
    expect(result).toContain("line1");
    expect(result).toContain("line2");
  });

  it("table with non-array non-object data returns empty string", () => {
    expect(formatOutput("just a string", "table")).toBe("");
    expect(formatOutput(42, "table")).toBe("");
    expect(formatOutput(null, "table")).toBe("");
  });

  it("markdown with non-array non-object data returns empty string", () => {
    expect(formatOutput("just a string", "markdown")).toBe("");
    expect(formatOutput(42, "markdown")).toBe("");
    expect(formatOutput(null, "markdown")).toBe("");
  });

  it("table with empty array returns empty string", () => {
    expect(formatOutput([], "table")).toBe("");
  });

  it("markdown with empty array returns empty string", () => {
    expect(formatOutput([], "markdown")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Additional subscriptions coverage
// ---------------------------------------------------------------------------
describe("subscriptions commands – additional coverage", () => {
  function subMockClient(): any {
    return {
      subscriptions: {
        list: vi.fn().mockResolvedValue({ subscriptions: [{ productId: "sub1" }] }),
        get: vi.fn().mockResolvedValue({ productId: "sub1" }),
        create: vi.fn().mockResolvedValue({ productId: "sub1" }),
        update: vi.fn().mockResolvedValue({ productId: "sub1" }),
        delete: vi.fn().mockResolvedValue(undefined),
        activateBasePlan: vi.fn().mockResolvedValue({ productId: "sub1" }),
        deactivateBasePlan: vi.fn().mockResolvedValue({ productId: "sub1" }),
        deleteBasePlan: vi.fn().mockResolvedValue(undefined),
        migratePrices: vi.fn().mockResolvedValue({ productId: "sub1" }),
        listOffers: vi.fn().mockResolvedValue({ subscriptionOffers: [] }),
        getOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        createOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        updateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        deleteOffer: vi.fn().mockResolvedValue(undefined),
        activateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
        deactivateOffer: vi.fn().mockResolvedValue({ offerId: "o1" }),
      },
    };
  }

  it("getOffer calls client.subscriptions.getOffer", async () => {
    const client = subMockClient();
    const result = await getOffer(client, "com.example", "sub1", "bp1", "o1");
    expect(client.subscriptions.getOffer).toHaveBeenCalledWith("com.example", "sub1", "bp1", "o1");
    expect(result.offerId).toBe("o1");
  });

  it("updateOffer passes updateMask", async () => {
    const client = subMockClient();
    const data = { offerId: "o1" } as any;
    await updateOffer(client, "com.example", "sub1", "bp1", "o1", data, "phases");
    expect(client.subscriptions.updateOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
      data,
      "phases",
    );
  });

  it("updateOffer works without updateMask", async () => {
    const client = subMockClient();
    const data = { offerId: "o1" } as any;
    await updateOffer(client, "com.example", "sub1", "bp1", "o1", data);
    expect(client.subscriptions.updateOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
      data,
      undefined,
    );
  });

  it("deactivateOffer calls client.subscriptions.deactivateOffer", async () => {
    const client = subMockClient();
    const result = await deactivateOffer(client, "com.example", "sub1", "bp1", "o1");
    expect(client.subscriptions.deactivateOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
    );
    expect(result.offerId).toBe("o1");
  });

  it("migratePrices calls client.subscriptions.migratePrices", async () => {
    const client = subMockClient();
    const data = { regionalPriceMigrations: [] } as any;
    const result = await migratePrices(client, "com.example", "sub1", "bp1", data);
    expect(client.subscriptions.migratePrices).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      data,
    );
    expect(result.productId).toBe("sub1");
  });
});

// ---------------------------------------------------------------------------
// Additional exportReviews coverage (language & since filters)
// ---------------------------------------------------------------------------
describe("exportReviews – additional filters", () => {
  function reviewMockClient(): any {
    return {
      reviews: {
        list: vi.fn().mockResolvedValue({ reviews: [] }),
        get: vi.fn(),
        reply: vi.fn(),
      },
    } as any;
  }

  function makeReviewForExport(overrides: any = {}) {
    return {
      reviewId: overrides.reviewId ?? "r1",
      authorName: "User",
      comments: [
        {
          userComment: {
            text: overrides.text ?? "Great app!",
            lastModified: { seconds: overrides.seconds ?? "1700000000" },
            starRating: overrides.starRating ?? 5,
            reviewerLanguage: overrides.language ?? "en",
            device: overrides.device ?? "Pixel",
            appVersionName: overrides.appVersionName ?? "1.0.0",
          },
        },
      ],
    };
  }

  it("filters by language during export", async () => {
    const client = reviewMockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [
        makeReviewForExport({ language: "en" }),
        makeReviewForExport({ reviewId: "r2", language: "ja" }),
        makeReviewForExport({ reviewId: "r3", language: "en" }),
      ],
    });

    const result = await exportReviews(client, "com.example.app", { language: "ja" });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].reviewId).toBe("r2");
  });

  it("filters by since date during export", async () => {
    const client = reviewMockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [
        makeReviewForExport({ seconds: "1700000000" }),
        makeReviewForExport({ reviewId: "r2", seconds: "1600000000" }),
        makeReviewForExport({ reviewId: "r3", seconds: "1750000000" }),
      ],
    });

    // 1700000000 = 2023-11-14T22:13:20Z — filter to only reviews on or after this time
    const result = await exportReviews(client, "com.example.app", {
      since: "2023-11-14T22:13:20Z",
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((r: any) => r.reviewId).sort()).toEqual(["r1", "r3"]);
  });

  it("combines language and since filters during export", async () => {
    const client = reviewMockClient();
    client.reviews.list.mockResolvedValue({
      reviews: [
        makeReviewForExport({ language: "en", seconds: "1700000000" }),
        makeReviewForExport({ reviewId: "r2", language: "ja", seconds: "1700000000" }),
        makeReviewForExport({ reviewId: "r3", language: "ja", seconds: "1600000000" }),
      ],
    });

    const result = await exportReviews(client, "com.example.app", {
      language: "ja",
      since: "2023-11-14T00:00:00Z",
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].reviewId).toBe("r2");
  });
});

// ---------------------------------------------------------------------------
// Additional PluginManager / discoverPlugins coverage
// ---------------------------------------------------------------------------
describe("discoverPlugins – resolvePlugin fallbacks", () => {
  it("resolves a named 'plugin' export", async () => {
    // We test resolvePlugin indirectly via discoverPlugins using dynamic import mock
    // Since discoverPlugins uses dynamic import we mock it at module level
    const originalImport = globalThis.__proto__.constructor;
    // Instead, test PluginManager.load with valid plugin objects directly
    const manager = new PluginManager();
    const plugin: GpcPlugin = {
      name: "named-export-plugin",
      version: "2.0.0",
      register(hooks) {
        hooks.beforeCommand(async () => {});
      },
    };
    await manager.load(plugin);
    expect(manager.getLoadedPlugins()).toHaveLength(1);
    expect(manager.getLoadedPlugins()[0]!.name).toBe("named-export-plugin");
  });

  it("validates permissions throw PLUGIN_INVALID_PERMISSION code", async () => {
    const manager = new PluginManager();
    try {
      await manager.load(
        { name: "evil-plugin", version: "1.0.0", register() {} },
        { name: "evil-plugin", version: "1.0.0", permissions: ["filesystem:write" as any] },
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.code).toBe("PLUGIN_INVALID_PERMISSION");
      expect(err.message).toContain("filesystem:write");
    }
  });

  it("trusted plugin via manifest skips permission validation", async () => {
    const manager = new PluginManager();
    await manager.load(
      { name: "third-party", version: "1.0.0", register() {} },
      { name: "third-party", version: "1.0.0", trusted: true, permissions: ["api:write"] },
    );
    expect(manager.getLoadedPlugins()[0]!.trusted).toBe(true);
  });
});

describe("PluginManager – lifecycle edge cases", () => {
  it("runBeforeCommand with no handlers does nothing", async () => {
    const manager = new PluginManager();
    // Should not throw
    await manager.runBeforeCommand({ command: "apps list", args: {}, startedAt: new Date() });
  });

  it("runAfterCommand with no handlers does nothing", async () => {
    const manager = new PluginManager();
    await manager.runAfterCommand(
      { command: "apps list", args: {}, startedAt: new Date() },
      { success: true, durationMs: 50, exitCode: 0 },
    );
  });

  it("runOnError with no handlers does nothing", async () => {
    const manager = new PluginManager();
    await manager.runOnError(
      { command: "apps list", args: {}, startedAt: new Date() },
      { code: "ERR", message: "fail", exitCode: 1 },
    );
  });

  it("getRegisteredCommands returns a copy", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.registerCommands((r) =>
          r.add({ name: "cmd1", description: "d", action: async () => {} }),
        );
      },
    });
    const cmds1 = manager.getRegisteredCommands();
    const cmds2 = manager.getRegisteredCommands();
    expect(cmds1).toEqual(cmds2);
    expect(cmds1).not.toBe(cmds2); // different array references
  });

  it("multiple plugins register commands independently", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "p1",
      version: "1.0.0",
      register(hooks) {
        hooks.registerCommands((r) =>
          r.add({ name: "cmd-a", description: "A", action: async () => {} }),
        );
      },
    });
    await manager.load({
      name: "p2",
      version: "1.0.0",
      register(hooks) {
        hooks.registerCommands((r) =>
          r.add({ name: "cmd-b", description: "B", action: async () => {} }),
        );
      },
    });
    const cmds = manager.getRegisteredCommands();
    expect(cmds).toHaveLength(2);
    expect(cmds.map((c) => c.name)).toEqual(["cmd-a", "cmd-b"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 8.6 – beforeRequest/afterResponse hooks
// ---------------------------------------------------------------------------
describe("PluginManager – request/response hooks", () => {
  it("runs beforeRequest handlers", async () => {
    const manager = new PluginManager();
    const calls: string[] = [];

    await manager.load({
      name: "req-plugin",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async (req) => {
          calls.push(`${req.method} ${req.path}`);
        });
      },
    });

    await manager.runBeforeRequest({ method: "GET", path: "/apps", startedAt: new Date() });
    expect(calls).toEqual(["GET /apps"]);
  });

  it("runs afterResponse handlers", async () => {
    const manager = new PluginManager();
    const calls: { path: string; status: number; durationMs: number }[] = [];

    await manager.load({
      name: "res-plugin",
      version: "1.0.0",
      register(hooks) {
        hooks.afterResponse(async (req, res) => {
          calls.push({ path: req.path, status: res.status, durationMs: res.durationMs });
        });
      },
    });

    const reqEvent = { method: "POST", path: "/upload", startedAt: new Date() };
    await manager.runAfterResponse(reqEvent, { status: 200, durationMs: 150, ok: true });
    expect(calls).toEqual([{ path: "/upload", status: 200, durationMs: 150 }]);
  });

  it("beforeRequest handler errors don't propagate", async () => {
    const manager = new PluginManager();

    await manager.load({
      name: "bad-req",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async () => {
          throw new Error("boom");
        });
      },
    });

    // Should not throw
    await manager.runBeforeRequest({ method: "GET", path: "/test", startedAt: new Date() });
  });

  it("afterResponse handler errors don't propagate", async () => {
    const manager = new PluginManager();

    await manager.load({
      name: "bad-res",
      version: "1.0.0",
      register(hooks) {
        hooks.afterResponse(async () => {
          throw new Error("boom");
        });
      },
    });

    await manager.runAfterResponse(
      { method: "GET", path: "/test", startedAt: new Date() },
      { status: 200, durationMs: 10, ok: true },
    );
  });

  it("hasRequestHooks returns false when no hooks registered", () => {
    const manager = new PluginManager();
    expect(manager.hasRequestHooks()).toBe(false);
  });

  it("hasRequestHooks returns true when beforeRequest registered", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "hook-check",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async () => {});
      },
    });
    expect(manager.hasRequestHooks()).toBe(true);
  });

  it("hasRequestHooks returns true when afterResponse registered", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "hook-check-2",
      version: "1.0.0",
      register(hooks) {
        hooks.afterResponse(async () => {});
      },
    });
    expect(manager.hasRequestHooks()).toBe(true);
  });

  it("runs multiple request handlers in order", async () => {
    const manager = new PluginManager();
    const order: number[] = [];

    await manager.load({
      name: "first",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async () => {
          order.push(1);
        });
      },
    });

    await manager.load({
      name: "second",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async () => {
          order.push(2);
        });
      },
    });

    await manager.runBeforeRequest({ method: "GET", path: "/test", startedAt: new Date() });
    expect(order).toEqual([1, 2]);
  });

  it("runBeforeRequest with no handlers does nothing", async () => {
    const manager = new PluginManager();
    await manager.runBeforeRequest({ method: "GET", path: "/test", startedAt: new Date() });
  });

  it("runAfterResponse with no handlers does nothing", async () => {
    const manager = new PluginManager();
    await manager.runAfterResponse(
      { method: "GET", path: "/test", startedAt: new Date() },
      { status: 200, durationMs: 10, ok: true },
    );
  });

  it("new hooks are cleared on reset", async () => {
    const manager = new PluginManager();
    await manager.load({
      name: "resettable",
      version: "1.0.0",
      register(hooks) {
        hooks.beforeRequest(async () => {});
        hooks.afterResponse(async () => {});
      },
    });
    expect(manager.hasRequestHooks()).toBe(true);
    manager.reset();
    expect(manager.hasRequestHooks()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – uploadRelease
// ---------------------------------------------------------------------------
describe("uploadRelease – edge cases", () => {
  it("throws when file validation fails", async () => {
    const { validateUploadFile } = await import("../src/utils/file-validation.js");
    (validateUploadFile as any).mockResolvedValueOnce({
      valid: false,
      fileType: "aab",
      sizeBytes: 0,
      errors: ["File is empty", "Invalid signature"],
      warnings: [],
    });

    const client = mockClient();
    await expect(
      uploadRelease(client, PKG, "/tmp/bad.aab", { track: "internal" }),
    ).rejects.toThrow("File validation failed");
    // Should NOT have called edits.insert since validation happens first
  });

  it("cleans up edit when bundle upload throws", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("bundle upload error"));

    await expect(
      uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" }),
    ).rejects.toThrow("bundle upload error");

    expect(client.edits.insert).toHaveBeenCalled();
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("uploads mapping file when provided", async () => {
    const client = mockClient();
    client.deobfuscation = {
      upload: vi.fn().mockResolvedValue({}),
    };

    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "production",
      mappingFile: "/tmp/mapping.txt",
    });

    expect(client.deobfuscation.upload).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      42,
      "/tmp/mapping.txt",
    );
  });

  it("cleans up edit when mapping file upload fails", async () => {
    const client = mockClient();
    client.deobfuscation = {
      upload: vi.fn().mockRejectedValue(new Error("mapping upload failed")),
    };

    await expect(
      uploadRelease(client, PKG, "/tmp/app.aab", {
        track: "production",
        mappingFile: "/tmp/mapping.txt",
      }),
    ).rejects.toThrow("mapping upload failed");

    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("includes releaseNotes and releaseName in the release object", async () => {
    const client = mockClient();
    const notes = [
      { language: "en-US", text: "Fixed bugs" },
      { language: "ja-JP", text: "Corrected errors" },
    ];
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "beta",
      releaseNotes: notes,
      releaseName: "Release 3.0",
    });

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "beta",
      expect.objectContaining({
        releaseNotes: notes,
        name: "Release 3.0",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – promoteRelease
// ---------------------------------------------------------------------------
describe("promoteRelease – edge cases", () => {
  it("throws when source track has empty releases array", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "alpha",
      releases: [],
    });

    await expect(
      promoteRelease(client, PKG, "alpha", "production"),
    ).rejects.toThrow('No active release found on track "alpha"');
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("userFraction 0 is treated as no rollout (completed status)", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [{ versionCodes: ["10"], status: "completed" }],
    });

    const result = await promoteRelease(client, PKG, "beta", "production", { userFraction: 0 });
    // 0 is falsy, so it's treated as "no fraction" => completed
    expect(result.status).toBe("completed");
    expect(result.userFraction).toBeUndefined();
  });

  it("throws when userFraction is greater than 1", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [{ versionCodes: ["10"], status: "completed" }],
    });

    await expect(
      promoteRelease(client, PKG, "beta", "production", { userFraction: 1.5 }),
    ).rejects.toThrow("Rollout percentage must be between 0 and 1");
  });

  it("uses source release notes when no releaseNotes option provided", async () => {
    const client = mockClient();
    const sourceNotes = [{ language: "en-US", text: "source notes" }];
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [
        {
          versionCodes: ["42"],
          status: "completed",
          releaseNotes: sourceNotes,
        },
      ],
    });

    await promoteRelease(client, PKG, "internal", "production");

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        releaseNotes: sourceNotes,
      }),
    );
  });

  it("uses empty array for releaseNotes when source has none", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [{ versionCodes: ["42"], status: "completed" }],
    });

    await promoteRelease(client, PKG, "internal", "production");

    expect(client.tracks.update).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "production",
      expect.objectContaining({
        releaseNotes: [],
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – updateRollout
// ---------------------------------------------------------------------------
describe("updateRollout – edge cases", () => {
  it("increase throws when userFraction is 0", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    await expect(
      updateRollout(client, PKG, "production", "increase", 0),
    ).rejects.toThrow("--to <percentage> is required for rollout increase");
  });

  it("increase throws when userFraction exceeds 1", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    await expect(
      updateRollout(client, PKG, "production", "increase", 1.5),
    ).rejects.toThrow("Rollout percentage must be between 0 and 1");
  });

  it("halt preserves current userFraction from inProgress release", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.7 }],
    });

    const result = await updateRollout(client, PKG, "production", "halt");

    expect(result.status).toBe("halted");
    expect(result.userFraction).toBe(0.7);
  });

  it("resume preserves current userFraction from halted release", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "halted", userFraction: 0.4 }],
    });

    const result = await updateRollout(client, PKG, "production", "resume");

    expect(result.status).toBe("inProgress");
    expect(result.userFraction).toBe(0.4);
  });

  it("complete removes userFraction from the release", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.8 }],
    });

    const result = await updateRollout(client, PKG, "production", "complete");

    expect(result.status).toBe("completed");
    expect(result.userFraction).toBeUndefined();
    const updateCall = client.tracks.update.mock.calls[0][3];
    expect(updateCall).not.toHaveProperty("userFraction");
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – reports
// ---------------------------------------------------------------------------
describe("report commands – edge cases", () => {
  it("parseMonth accepts boundary months (01 and 12)", () => {
    expect(parseMonth("2026-01")).toEqual({ year: 2026, month: 1 });
    expect(parseMonth("2026-12")).toEqual({ year: 2026, month: 12 });
  });

  it("parseMonth throws on month 00", () => {
    expect(() => parseMonth("2026-00")).toThrow("Invalid month");
  });

  it("parseMonth throws on month 13", () => {
    expect(() => parseMonth("2026-13")).toThrow("Invalid month");
  });

  it("parseMonth throws on alphabetic input", () => {
    expect(() => parseMonth("abcd-ef")).toThrow("Invalid month format");
  });

  it("parseMonth throws on empty string", () => {
    expect(() => parseMonth("")).toThrow("Invalid month format");
  });

  it("downloadReport throws when report download HTTP fails", async () => {
    const client: any = {
      reports: {
        list: vi.fn().mockResolvedValue({
          reports: [{ bucketId: "b1", uri: "https://storage.example.com/r.csv" }],
        }),
      },
    };
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", mockFetch);

    try {
      await expect(
        downloadReport(client, "com.example", "earnings", 2026, 3),
      ).rejects.toThrow("Failed to download report from signed URI: HTTP 403");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("isValidReportType rejects empty string", () => {
    expect(isValidReportType("")).toBe(false);
  });

  it("isValidStatsDimension accepts all valid dimensions", () => {
    for (const dim of ["country", "language", "os_version", "device", "app_version", "carrier", "overview"]) {
      expect(isValidStatsDimension(dim)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – users
// ---------------------------------------------------------------------------
describe("user commands – edge cases", () => {
  function mockUsersClient(): any {
    return {
      list: vi.fn().mockResolvedValue({ users: [{ email: "a@b.com" }] }),
      get: vi.fn().mockResolvedValue({ email: "a@b.com", name: "Alice" }),
      create: vi.fn().mockResolvedValue({ email: "new@b.com" }),
      update: vi.fn().mockResolvedValue({ email: "a@b.com" }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("inviteUser creates user with email only (no permissions)", async () => {
    const client = mockUsersClient();
    await inviteUser(client, "12345", "new@b.com");
    const call = client.create.mock.calls[0];
    expect(call[1]).toEqual({ email: "new@b.com" });
    expect(call[1].developerAccountPermission).toBeUndefined();
    expect(call[1].grants).toBeUndefined();
  });

  it("updateUser with only grants sends grants mask", async () => {
    const client = mockUsersClient();
    const grants = [{ packageName: "com.example", appLevelPermissions: ["ADMIN" as const] }];
    await updateUser(client, "12345", "a@b.com", undefined, grants);
    expect(client.update).toHaveBeenCalledWith(
      "12345",
      "a@b.com",
      { grants },
      "grants",
    );
  });

  it("updateUser with no changes sends undefined updateMask", async () => {
    const client = mockUsersClient();
    await updateUser(client, "12345", "a@b.com");
    expect(client.update).toHaveBeenCalledWith("12345", "a@b.com", {}, undefined);
  });

  it("parseGrantArg handles multiple permissions", () => {
    const grant = parseGrantArg("com.example:PERM_A,PERM_B,PERM_C");
    expect(grant.packageName).toBe("com.example");
    expect(grant.appLevelPermissions).toEqual(["PERM_A", "PERM_B", "PERM_C"]);
  });

  it("parseGrantArg handles package with dots and single permission", () => {
    const grant = parseGrantArg("com.example.app:VIEW");
    expect(grant.packageName).toBe("com.example.app");
    expect(grant.appLevelPermissions).toEqual(["VIEW"]);
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – testers
// ---------------------------------------------------------------------------
describe("tester commands – edge cases", () => {
  function mockTesterClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1" }),
        validate: vi.fn().mockResolvedValue({}),
        commit: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      testers: {
        get: vi.fn().mockResolvedValue({ googleGroups: [], googleGroupsCount: 0 }),
        update: vi.fn().mockImplementation((_pkg, _editId, _track, data) => Promise.resolve(data)),
      },
    };
  }

  it("addTesters to empty group list creates new list", async () => {
    const client = mockTesterClient();
    const result = await addTesters(client, "com.example", "beta", [
      "new1@example.com",
      "new2@example.com",
    ]);
    expect(result.googleGroups).toContain("new1@example.com");
    expect(result.googleGroups).toContain("new2@example.com");
  });

  it("removeTesters from empty list returns empty", async () => {
    const client = mockTesterClient();
    const result = await removeTesters(client, "com.example", "beta", ["a@example.com"]);
    expect(result.googleGroups).toEqual([]);
  });

  it("removeTesters cleans up edit on API error", async () => {
    const client = mockTesterClient();
    client.testers.get.mockRejectedValue(new Error("API fail"));

    await expect(
      removeTesters(client, "com.example", "internal", ["a@b.com"]),
    ).rejects.toThrow("API fail");
    expect(client.edits.delete).toHaveBeenCalled();
  });

  it("importTestersFromCsv with whitespace-only entries filters them out", async () => {
    const client = mockTesterClient();
    const fsModule = await import("node:fs/promises");
    const dir = await mkdtemp(join(tmpdir(), "gpc-testers-edge-"));
    const csvPath = join(dir, "testers.csv");
    await fsModule.writeFile(csvPath, "  ,  ,test@example.com, ,\n  ");

    try {
      const result = await importTestersFromCsv(client, "com.example", "internal", csvPath);
      expect(result.added).toBe(1);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("listTesters always deletes edit even on success", async () => {
    const client = mockTesterClient();
    await listTesters(client, "com.example", "internal");
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.commit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Edge case tests – diffListings
// ---------------------------------------------------------------------------
describe("diffListings – edge cases", () => {
  it("remote-only language with empty fields produces no diffs", () => {
    const local: any[] = [];
    const remote = [
      { language: "ko-KR", title: "", shortDescription: "", fullDescription: "" },
    ];
    const diffs = diffListings(local, remote);
    expect(diffs).toHaveLength(0);
  });

  it("handles missing optional fields gracefully", () => {
    const local = [{ language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" }];
    const remote = [{ language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" }];
    // Add a video field only to remote
    (remote[0] as any).video = "https://youtube.com/v/123";
    const diffs = diffListings(local, remote);
    // Should detect the video field difference
    expect(diffs.some((d) => d.field === "video")).toBe(true);
  });

  it("detects multiple field differences in same language", () => {
    const local = [
      { language: "en-US", title: "New Title", shortDescription: "New Short", fullDescription: "f" },
    ];
    const remote = [
      { language: "en-US", title: "Old Title", shortDescription: "Old Short", fullDescription: "f" },
    ];
    const diffs = diffListings(local, remote);
    expect(diffs).toHaveLength(2);
    expect(diffs.map((d) => d.field).sort()).toEqual(["shortDescription", "title"]);
  });
});

// ---------------------------------------------------------------------------
// Data Safety
// ---------------------------------------------------------------------------
import {
  getDataSafety,
  updateDataSafety,
  exportDataSafety,
  importDataSafety,
} from "../src/commands/data-safety.js";

describe("data-safety commands", () => {

  const sampleDataSafety = {
    dataTypes: [
      {
        dataType: "location",
        dataCategory: "Location",
        collected: true,
        shared: false,
        ephemeral: false,
        required: true,
        purposes: ["App functionality"],
      },
    ],
    purposes: [{ purpose: "App functionality" }],
    securityPractices: {
      dataEncryptedInTransit: true,
      dataDeleteable: true,
      independentSecurityReview: false,
    },
  };

  function mockClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1" }),
        validate: vi.fn().mockResolvedValue({}),
        commit: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      dataSafety: {
        get: vi.fn().mockResolvedValue(sampleDataSafety),
        update: vi.fn().mockResolvedValue(sampleDataSafety),
      },
    };
  }

  it("getDataSafety opens edit, reads data safety, deletes edit", async () => {
    const client = mockClient();
    const result = await getDataSafety(client, "com.example");
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.dataSafety.get).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
    expect(result.securityPractices?.dataEncryptedInTransit).toBe(true);
    expect(result.dataTypes).toHaveLength(1);
  });

  it("updateDataSafety opens edit, updates, validates, commits", async () => {
    const client = mockClient();
    const result = await updateDataSafety(client, "com.example", sampleDataSafety);
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.dataSafety.update).toHaveBeenCalledWith("com.example", "edit-1", sampleDataSafety);
    expect(client.edits.validate).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit-1");
    expect(result).toEqual(sampleDataSafety);
  });

  it("exportDataSafety writes JSON to file", async () => {
    const client = mockClient();
    const tmpDir = await mkdtemp(join(tmpdir(), "gpc-ds-"));
    const outPath = join(tmpDir, "data-safety.json");
    const result = await exportDataSafety(client, "com.example", outPath);
    expect(result).toEqual(sampleDataSafety);

    const { readFile } = await import("node:fs/promises");
    const written = JSON.parse(await readFile(outPath, "utf-8"));
    expect(written).toEqual(sampleDataSafety);

    await rm(tmpDir, { recursive: true });
  });

  it("importDataSafety reads JSON from file and updates", async () => {
    const client = mockClient();
    const tmpDir = await mkdtemp(join(tmpdir(), "gpc-ds-"));
    const filePath = join(tmpDir, "data-safety.json");

    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, JSON.stringify(sampleDataSafety), "utf-8");

    const result = await importDataSafety(client, "com.example", filePath);
    expect(client.dataSafety.update).toHaveBeenCalledWith("com.example", "edit-1", sampleDataSafety);
    expect(result).toEqual(sampleDataSafety);

    await rm(tmpDir, { recursive: true });
  });

  it("getDataSafety cleans up edit on error", async () => {
    const client = mockClient();
    client.dataSafety.get.mockRejectedValue(new Error("API error"));
    await expect(getDataSafety(client, "com.example")).rejects.toThrow("API error");
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
  });

  it("updateDataSafety cleans up edit on error", async () => {
    const client = mockClient();
    client.dataSafety.update.mockRejectedValue(new Error("API error"));
    await expect(updateDataSafety(client, "com.example", sampleDataSafety)).rejects.toThrow("API error");
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
  });

  it("importDataSafety throws on invalid JSON", async () => {
    const client = mockClient();
    const tmpDir = await mkdtemp(join(tmpdir(), "gpc-ds-"));
    const filePath = join(tmpDir, "bad.json");

    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, "not valid json{{{", "utf-8");

    await expect(importDataSafety(client, "com.example", filePath)).rejects.toThrow(
      "Failed to parse data safety JSON",
    );

    await rm(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// External Transactions
// ---------------------------------------------------------------------------

import {
  createExternalTransaction,
  getExternalTransaction,
  refundExternalTransaction,
} from "../src/commands/external-transactions.js";

describe("external transactions commands", () => {
  function mockClient(): any {
    return {
      externalTransactions: {
        create: vi.fn().mockResolvedValue({
          externalTransactionId: "ext-txn-1",
          transactionState: "TRANSACTION_STATE_COMPLETED",
          createTime: "2026-01-15T10:00:00Z",
        }),
        get: vi.fn().mockResolvedValue({
          externalTransactionId: "ext-txn-1",
          transactionState: "TRANSACTION_STATE_COMPLETED",
          originalPreTaxAmount: { priceMicros: "1990000", currency: "USD" },
        }),
        refund: vi.fn().mockResolvedValue({
          externalTransactionId: "ext-txn-1",
          transactionState: "TRANSACTION_STATE_REFUNDED",
        }),
      },
    };
  }

  it("createExternalTransaction calls client.externalTransactions.create", async () => {
    const client = mockClient();
    const txnData = {
      originalPreTaxAmount: { priceMicros: "1990000", currency: "USD" },
      originalTaxAmount: { priceMicros: "0", currency: "USD" },
      oneTimeTransaction: { externalTransactionToken: "tok-abc" },
    };
    const result = await createExternalTransaction(client, "com.example", txnData);
    expect(client.externalTransactions.create).toHaveBeenCalledWith("com.example", txnData);
    expect(result.externalTransactionId).toBe("ext-txn-1");
    expect(result.transactionState).toBe("TRANSACTION_STATE_COMPLETED");
  });

  it("getExternalTransaction calls client.externalTransactions.get", async () => {
    const client = mockClient();
    const result = await getExternalTransaction(client, "com.example", "ext-txn-1");
    expect(client.externalTransactions.get).toHaveBeenCalledWith("com.example", "ext-txn-1");
    expect(result.externalTransactionId).toBe("ext-txn-1");
    expect(result.originalPreTaxAmount?.priceMicros).toBe("1990000");
  });

  it("refundExternalTransaction calls client.externalTransactions.refund", async () => {
    const client = mockClient();
    const refundData = { fullRefund: {} };
    const result = await refundExternalTransaction(
      client,
      "com.example",
      "ext-txn-1",
      refundData,
    );
    expect(client.externalTransactions.refund).toHaveBeenCalledWith(
      "com.example",
      "ext-txn-1",
      refundData,
    );
    expect(result.transactionState).toBe("TRANSACTION_STATE_REFUNDED");
  });
});
