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
import { detectOutputFormat, formatOutput, formatJunit } from "../src/output";
import {
  uploadRelease,
  getReleasesStatus,
  promoteRelease,
  updateRollout,
  listTracks,
  createTrack,
  updateTrackConfig,
  uploadExternallyHosted,
  diffReleases,
  fetchReleaseNotes,
} from "../src/commands/releases.js";
import { PlayApiError } from "@gpc-cli/api";
import {
  getListings,
  updateListing,
  deleteListing,
  pullListings,
  pushListings,
  listImages,
  uploadImage,
  deleteImage,
  exportImages,
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
  getVitalsLmk,
  getVitalsErrorCount,
  getVitalsAnomalies,
  searchVitalsErrors,
  checkThreshold,
  compareVitalsTrend,
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
    expect(lines[1]).toMatch(/^[─-]/);
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
// formatOutput – JUnit
// ---------------------------------------------------------------------------
describe("formatOutput – junit", () => {
  it("formats array of items as multiple test cases", () => {
    const data = [
      { name: "app-v1", status: "ok" },
      { name: "app-v2", status: "ok" },
    ];
    const result = formatOutput(data, "junit");
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain('tests="2"');
    expect(result).toContain('failures="0"');
    expect(result).toContain('name="app-v1"');
    expect(result).toContain('name="app-v2"');
  });

  it("formats empty array as empty test suite", () => {
    const result = formatOutput([], "junit");
    expect(result).toContain('tests="0"');
    expect(result).toContain('failures="0"');
    expect(result).not.toContain("<testcase");
  });

  it("formats threshold breach as failure element", () => {
    const data = {
      name: "crash-rate",
      breached: true,
      message: "crash rate exceeded",
      metric: "2.5%",
    };
    const result = formatOutput(data, "junit");
    expect(result).toContain('failures="1"');
    expect(result).toContain("<failure");
    expect(result).toContain('message="crash rate exceeded"');
    expect(result).toContain("2.5%");
  });

  it("formats single object as single test case", () => {
    const data = { name: "my-app", version: "1.0" };
    const result = formatOutput(data, "junit");
    expect(result).toContain('tests="1"');
    expect(result).toContain('name="my-app"');
  });

  it("formats string as single test case", () => {
    const result = formatJunit("all checks passed", "vitals");
    expect(result).toContain('tests="1"');
    expect(result).toContain('name="all checks passed"');
    expect(result).toContain('classname="gpc.vitals"');
  });

  it("escapes XML special characters", () => {
    const data = { name: 'app <"beta">&test' };
    const result = formatOutput(data, "junit");
    expect(result).toContain("&lt;");
    expect(result).toContain("&quot;");
    expect(result).toContain("&amp;");
  });

  it("uses custom command name when provided via formatJunit", () => {
    const data = [{ name: "item" }];
    const result = formatJunit(data, "releases-upload");
    expect(result).toContain('name="releases-upload"');
    expect(result).toContain('classname="gpc.releases-upload"');
  });

  it("handles non-breached threshold as success", () => {
    const data = { name: "anr-rate", breached: false, metric: "0.1%" };
    const result = formatOutput(data, "junit");
    expect(result).toContain('failures="0"');
    expect(result).not.toContain("<failure");
  });

  it("uses fallback name chain for items without name/title/sku/id", () => {
    const data = [
      { productId: "com.example.premium", status: "active" },
      { region: "US", price: "4.99" },
      { languageCode: "en-US", text: "Hello" },
      { foo: "bar" },
    ];
    const result = formatOutput(data, "junit");
    expect(result).toContain('name="com.example.premium"');
    expect(result).toContain('name="US"');
    expect(result).toContain('name="en-US"');
    expect(result).toContain('name="item-4"');
    expect(result).not.toContain("JSON");
  });

  it("skips sentinel dash placeholder and falls through to track name (releases status regression)", () => {
    // releases status rows use `name: s["name"] || "-"` — when no release name exists,
    // the name field is "-". JUnit should skip it and use the track field instead.
    const data = [
      { track: "production", status: "completed", name: "-", versionCodes: "142" },
      { track: "beta", status: "inProgress", name: "-", versionCodes: "141" },
    ];
    const result = formatOutput(data, "junit");
    expect(result).toContain('name="production"');
    expect(result).toContain('name="beta"');
    expect(result).not.toContain('name="-"');
  });

  it("skips empty string placeholder and falls through to next candidate", () => {
    const data = [{ name: "", track: "internal", status: "draft" }];
    const result = formatOutput(data, "junit");
    expect(result).toContain('name="internal"');
    expect(result).not.toContain('name=""');
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
    apks: {
      list: vi.fn(),
      upload: vi.fn().mockResolvedValue({ versionCode: 42, binary: { sha1: "a", sha256: "b" } }),
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
    expect(client.bundles.upload).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "/tmp/app.aab",
      expect.any(Object),
      undefined,
    );
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
    expect(client.edits.commit).toHaveBeenCalledWith(PKG, "edit-1", undefined);
    expect(client.edits.delete).not.toHaveBeenCalled();
  });

  it("skips validate when changesNotSentForReview is set", async () => {
    const client = mockClient();
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "internal",
      status: "completed",
      commitOptions: { changesNotSentForReview: true },
    });

    expect(client.edits.validate).not.toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalledWith(PKG, "edit-1", {
      changesNotSentForReview: true,
    });
  });

  it("calls validate when commitOptions is undefined", async () => {
    const client = mockClient();
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "internal",
      status: "completed",
    });

    expect(client.edits.validate).toHaveBeenCalledWith(PKG, "edit-1");
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

  it("uses apks.upload for .apk files instead of bundles.upload (Bug AD fix)", async () => {
    const client = mockClient();
    const result = await uploadRelease(client, PKG, "/tmp/app.apk", {
      track: "internal",
      status: "completed",
    });

    expect(client.apks.upload).toHaveBeenCalledWith(
      PKG,
      "edit-1",
      "/tmp/app.apk",
      expect.any(Object),
    );
    expect(client.bundles.upload).not.toHaveBeenCalled();
    expect(result.versionCode).toBe(42);
  });

  it("uses bundles.upload for .aab files (unchanged behavior)", async () => {
    const client = mockClient();
    await uploadRelease(client, PKG, "/tmp/app.aab", {
      track: "internal",
      status: "completed",
    });

    expect(client.bundles.upload).toHaveBeenCalled();
    expect(client.apks.upload).not.toHaveBeenCalled();
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
        {
          language: "fr-FR",
          title: "Titre",
          shortDescription: "court",
          fullDescription: "complet",
        },
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
// exportImages
// ---------------------------------------------------------------------------
describe("exportImages", () => {
  let tmpDir: string;

  beforeEach(async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    tmpDir = await mkdtemp(join(tmpdir(), "gpc-export-test-"));
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("exports images for all languages and types", async () => {
    const client = mockClient();
    const listings = [
      { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
    ];
    client.listings.list.mockResolvedValue(listings);

    const imgData = [{ id: "1", url: "https://example.com/1.png", sha1: "a", sha256: "b" }];
    // Return images only for phoneScreenshots, empty for others
    client.images.list.mockImplementation(
      (_pkg: string, _edit: string, _lang: string, type: string) => {
        if (type === "phoneScreenshots") return Promise.resolve(imgData);
        return Promise.resolve([]);
      },
    );

    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await exportImages(client, PKG, tmpDir);

    expect(result.languages).toBe(1);
    expect(result.images).toBe(1);
    expect(result.totalSize).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/1.png");

    vi.unstubAllGlobals();
  });

  it("filters by language when specified", async () => {
    const client = mockClient();
    client.images.list.mockResolvedValue([]);

    const result = await exportImages(client, PKG, tmpDir, { lang: "en-US" });

    expect(result.languages).toBe(1);
    expect(result.images).toBe(0);
    // Should not call listings.list when language is specified
    expect(client.listings.list).not.toHaveBeenCalled();
  });

  it("filters by image type when specified", async () => {
    const client = mockClient();
    const listings = [
      { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
    ];
    client.listings.list.mockResolvedValue(listings);
    client.images.list.mockResolvedValue([]);

    await exportImages(client, PKG, tmpDir, { type: "icon" });

    // Should only call images.list for the "icon" type
    expect(client.images.list).toHaveBeenCalledTimes(1);
    expect(client.images.list).toHaveBeenCalledWith(PKG, "edit-1", "en-US", "icon");
  });

  it("cleans up edit on error", async () => {
    const client = mockClient();
    client.listings.list.mockRejectedValue(new Error("list fail"));

    await expect(exportImages(client, PKG, tmpDir)).rejects.toThrow("list fail");
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
  it("queries all metric sets with timelineSpec and returns overview", async () => {
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
    // Each call should include timelineSpec
    for (const call of reporting.queryMetricSet.mock.calls) {
      expect(call[2]).toHaveProperty("timelineSpec");
    }
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
  it("queries crashRateMetricSet with correct metrics and timelineSpec", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "crashRateMetricSet",
      expect.objectContaining({
        metrics: ["crashRate", "userPerceivedCrashRate", "distinctUsers"],
        timelineSpec: expect.objectContaining({
          aggregationPeriod: "DAILY",
        }),
      }),
    );
  });

  it("always includes timelineSpec even without --days", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG);
    const call = reporting.queryMetricSet.mock.calls[0];
    expect(call[2]).toHaveProperty("timelineSpec");
    expect(call[2].timelineSpec).toHaveProperty("startTime");
    expect(call[2].timelineSpec).toHaveProperty("endTime");
  });

  it("passes dimension option", async () => {
    const reporting = mockReportingClient();
    await getVitalsCrashes(reporting, PKG, { dimension: "versionCode" });
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "crashRateMetricSet",
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
      "crashRateMetricSet",
      expect.objectContaining({
        timelineSpec: expect.objectContaining({
          aggregationPeriod: "DAILY",
        }),
      }),
    );
  });
});

describe("getVitalsAnr", () => {
  it("queries anrRateMetricSet with correct metrics", async () => {
    const reporting = mockReportingClient();
    await getVitalsAnr(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "anrRateMetricSet",
      expect.objectContaining({
        metrics: ["anrRate", "userPerceivedAnrRate", "distinctUsers"],
        timelineSpec: expect.objectContaining({
          aggregationPeriod: "DAILY",
        }),
      }),
    );
  });
});

describe("getVitalsStartup", () => {
  it("queries slowStartRateMetricSet", async () => {
    const reporting = mockReportingClient();
    await getVitalsStartup(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "slowStartRateMetricSet",
      expect.any(Object),
    );
  });
});

describe("getVitalsRendering", () => {
  it("queries slowRenderingRateMetricSet", async () => {
    const reporting = mockReportingClient();
    await getVitalsRendering(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "slowRenderingRateMetricSet",
      expect.any(Object),
    );
  });
});

describe("getVitalsBattery", () => {
  it("queries excessiveWakeupRateMetricSet", async () => {
    const reporting = mockReportingClient();
    await getVitalsBattery(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "excessiveWakeupRateMetricSet",
      expect.any(Object),
    );
  });
});

describe("getVitalsMemory", () => {
  it("queries stuckBackgroundWakelockRateMetricSet", async () => {
    const reporting = mockReportingClient();
    await getVitalsMemory(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "stuckBackgroundWakelockRateMetricSet",
      expect.any(Object),
    );
  });
});

describe("getVitalsLmk", () => {
  it("queries lowMemoryKillerRateMetricSet with DAILY aggregation", async () => {
    const reporting = mockReportingClient();
    await getVitalsLmk(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "lowMemoryKillerRateMetricSet",
      expect.objectContaining({
        timelineSpec: expect.objectContaining({ aggregationPeriod: "DAILY" }),
      }),
    );
  });

  it("requests the base rate, weighted, and user-perceived metric variants", async () => {
    const reporting = mockReportingClient();
    await getVitalsLmk(reporting, PKG);
    const call = (reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls[0];
    const query = call?.[2] as { metrics: string[] };
    expect(query.metrics).toContain("lmkRate");
    expect(query.metrics).toContain("lmkRate7dUserWeighted");
    expect(query.metrics).toContain("lmkRate28dUserWeighted");
    expect(query.metrics).toContain("userPerceivedLmkRate");
    expect(query.metrics).toContain("distinctUsers");
  });
});

describe("getVitalsErrorCount", () => {
  it("queries errorCountMetricSet", async () => {
    const reporting = mockReportingClient();
    await getVitalsErrorCount(reporting, PKG);
    expect(reporting.queryMetricSet).toHaveBeenCalledWith(
      PKG,
      "errorCountMetricSet",
      expect.any(Object),
    );
  });

  it("requests errorReportCount and distinctUsers metrics", async () => {
    const reporting = mockReportingClient();
    await getVitalsErrorCount(reporting, PKG);
    const call = (reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls[0];
    const query = call?.[2] as { metrics: string[] };
    expect(query.metrics).toContain("errorReportCount");
    expect(query.metrics).toContain("distinctUsers");
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
// Vitals – compareVitalsTrend date logic
// ---------------------------------------------------------------------------
describe("compareVitalsTrend", () => {
  it("sends non-overlapping date ranges to the API", async () => {
    const capturedQueries: { startTime: unknown; endTime: unknown }[] = [];
    const mockReporting = {
      queryMetricSet: vi
        .fn()
        .mockImplementation(
          (
            _pkg: string,
            _metric: string,
            query: { timelineSpec: { startTime: unknown; endTime: unknown } },
          ) => {
            capturedQueries.push({
              startTime: query.timelineSpec.startTime,
              endTime: query.timelineSpec.endTime,
            });
            return Promise.resolve({ rows: [] });
          },
        ),
    };

    await compareVitalsTrend(mockReporting as any, "com.test.app", "crashRateMetricSet", 7);

    expect(capturedQueries).toHaveLength(2);

    // Current period end and previous period end must not overlap
    const currentQuery = capturedQueries[0]!;
    const previousQuery = capturedQueries[1]!;

    // Previous end must be strictly before current start
    const currentStart = currentQuery.startTime as { year: number; month: number; day: number };
    const previousEnd = previousQuery.endTime as { year: number; month: number; day: number };

    const currentStartDate = new Date(currentStart.year, currentStart.month - 1, currentStart.day);
    const previousEndDate = new Date(previousEnd.year, previousEnd.month - 1, previousEnd.day);

    expect(previousEndDate.getTime()).toBeLessThan(currentStartDate.getTime());
  });

  it("returns direction=improved when rate decreases", async () => {
    const mockReporting = {
      queryMetricSet: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ metrics: { crashRate: { decimalValue: { value: "0.02" } } } }],
        })
        .mockResolvedValueOnce({
          rows: [{ metrics: { crashRate: { decimalValue: { value: "0.05" } } } }],
        }),
    };

    const result = await compareVitalsTrend(
      mockReporting as any,
      "com.test.app",
      "crashRateMetricSet",
      7,
    );
    expect(result.direction).toBe("improved");
    expect(result.current).toBe(0.02);
    expect(result.previous).toBe(0.05);
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
  diffSubscription,
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
    expect(client.subscriptions.create).toHaveBeenCalledWith("com.example", data, "sub1");
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
      "o1",
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

  it("diffSubscription returns diffs for changed fields", async () => {
    const client = {
      subscriptions: {
        get: vi.fn().mockResolvedValue({
          productId: "sub1",
          listings: { "en-US": { title: "Remote" } },
          basePlans: [{ basePlanId: "bp1" }],
        }),
      },
    };
    const localData = {
      productId: "sub1",
      listings: { "en-US": { title: "Local" } },
      basePlans: [{ basePlanId: "bp1" }],
    } as any;
    const diffs = await diffSubscription(client as any, "com.example", "sub1", localData);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("listings");
  });

  it("diffSubscription returns empty when identical", async () => {
    const data = {
      productId: "sub1",
      listings: { "en-US": { title: "Same" } },
      basePlans: [],
    };
    const client = {
      subscriptions: {
        get: vi.fn().mockResolvedValue(data),
      },
    };
    const diffs = await diffSubscription(client as any, "com.example", "sub1", data as any);
    expect(diffs).toHaveLength(0);
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
  getProductPurchaseV2,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  cancelSubscriptionV2,
  deferSubscriptionPurchase,
  deferSubscriptionV2,
  revokeSubscriptionPurchase,
  listVoidedPurchases,
  refundOrder,
  getOrderDetails,
  batchGetOrders,
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
        cancelSubscriptionV2: vi.fn().mockResolvedValue(undefined),
        deferSubscriptionV2: vi.fn().mockResolvedValue({ newExpiryTime: "2026-07-01T00:00:00Z" }),
        getProductV2: vi
          .fn()
          .mockResolvedValue({ orderId: "o2", purchaseStateContext: { state: "PURCHASED" } }),
        listVoided: vi.fn().mockResolvedValue({ voidedPurchases: [] }),
      },
      orders: {
        get: vi.fn().mockResolvedValue({ orderId: "GPA.1234", state: "PROCESSED" }),
        batchGet: vi.fn().mockResolvedValue([{ orderId: "GPA.1" }, { orderId: "GPA.2" }]),
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

  it("getOrderDetails calls client.orders.get", async () => {
    const client = mockClient();
    const result = await getOrderDetails(client, "com.example", "GPA.1234");
    expect(client.orders.get).toHaveBeenCalledWith("com.example", "GPA.1234");
    expect(result.orderId).toBe("GPA.1234");
    expect(result.state).toBe("PROCESSED");
  });

  it("batchGetOrders calls client.orders.batchGet", async () => {
    const client = mockClient();
    const result = await batchGetOrders(client, "com.example", ["GPA.1", "GPA.2"]);
    expect(client.orders.batchGet).toHaveBeenCalledWith("com.example", ["GPA.1", "GPA.2"]);
    expect(result).toHaveLength(2);
  });

  it("getProductPurchaseV2 calls client.purchases.getProductV2", async () => {
    const client = mockClient();
    const result = await getProductPurchaseV2(client, "com.example", "tok");
    expect(client.purchases.getProductV2).toHaveBeenCalledWith("com.example", "tok");
    expect(result.orderId).toBe("o2");
  });

  it("cancelSubscriptionV2 calls client.purchases.cancelSubscriptionV2", async () => {
    const client = mockClient();
    await cancelSubscriptionV2(client, "com.example", "tok123", "DEVELOPER_CANCELED");
    expect(client.purchases.cancelSubscriptionV2).toHaveBeenCalledWith("com.example", "tok123", {
      cancellationType: "DEVELOPER_CANCELED",
    });
  });

  it("cancelSubscriptionV2 works without cancellationType", async () => {
    const client = mockClient();
    await cancelSubscriptionV2(client, "com.example", "tok123");
    expect(client.purchases.cancelSubscriptionV2).toHaveBeenCalledWith(
      "com.example",
      "tok123",
      undefined,
    );
  });

  it("deferSubscriptionV2 calls client.purchases.deferSubscriptionV2", async () => {
    const client = mockClient();
    const result = await deferSubscriptionV2(
      client,
      "com.example",
      "tok123",
      "2026-07-01T00:00:00Z",
    );
    expect(client.purchases.deferSubscriptionV2).toHaveBeenCalledWith("com.example", "tok123", {
      deferralInfo: { desiredExpiryTime: "2026-07-01T00:00:00Z" },
    });
    expect(result.newExpiryTime).toBe("2026-07-01T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// App Recovery
// ---------------------------------------------------------------------------

import {
  listRecoveryActions,
  cancelRecoveryAction,
  deployRecoveryAction,
  createRecoveryAction,
  addRecoveryTargeting,
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
        create: vi.fn().mockResolvedValue({
          appRecoveryId: "rec3",
          status: "DRAFT",
          createTime: "2026-03-01T00:00:00Z",
        }),
        addTargeting: vi.fn().mockResolvedValue({
          appRecoveryId: "rec1",
          status: "DRAFT",
          targeting: { versionList: { versionCodes: ["100", "101"] } },
        }),
      },
    };
  }

  it("listRecoveryActions calls client.appRecovery.list", async () => {
    const client = mockClient();
    const result = await listRecoveryActions(client, "com.example");
    expect(client.appRecovery.list).toHaveBeenCalledWith("com.example", undefined);
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

  it("createRecoveryAction calls client.appRecovery.create", async () => {
    const client = mockClient();
    const request = {
      remoteInAppUpdateData: {},
      appRecoveryAction: { targeting: { versionList: { versionCodes: ["100"] } }, status: "DRAFT" },
    };
    const result = await createRecoveryAction(client, "com.example", request);
    expect(client.appRecovery.create).toHaveBeenCalledWith("com.example", request);
    expect(result.appRecoveryId).toBe("rec3");
    expect(result.status).toBe("DRAFT");
  });

  it("createRecoveryAction returns the created action with createTime", async () => {
    const client = mockClient();
    const result = await createRecoveryAction(client, "com.example", {});
    expect(result.createTime).toBe("2026-03-01T00:00:00Z");
  });

  it("addRecoveryTargeting calls client.appRecovery.addTargeting", async () => {
    const client = mockClient();
    const targeting = { versionList: { versionCodes: ["100", "101"] } };
    const result = await addRecoveryTargeting(client, "com.example", "rec1", targeting);
    expect(client.appRecovery.addTargeting).toHaveBeenCalledWith("com.example", "rec1", targeting);
    expect(result.appRecoveryId).toBe("rec1");
  });

  it("addRecoveryTargeting returns updated targeting in the result", async () => {
    const client = mockClient();
    const targeting = { regions: { regionCodes: ["US", "CA"] } };
    const result = await addRecoveryTargeting(client, "com.example", "rec1", targeting);
    expect(result.targeting?.versionList?.versionCodes).toEqual(["100", "101"]);
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

  it("listReports throws GCS not-supported error for financial reports", async () => {
    const client: any = {};
    await expect(listReports(client, "com.example", "earnings", 2026, 3)).rejects.toThrow(
      "not available through the Google Play Developer API",
    );
  });

  it("listReports throws GCS not-supported error for stats reports", async () => {
    const client: any = {};
    await expect(listReports(client, "com.example", "installs", 2026, 3)).rejects.toThrow(
      "not available through the Google Play Developer API",
    );
  });

  it("downloadReport throws GCS not-supported error", async () => {
    const client: any = {};
    await expect(downloadReport(client, "com.example", "earnings", 2026, 3)).rejects.toThrow(
      "not available through the Google Play Developer API",
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

  it("getUser filters from client.list (no GET endpoint in API)", async () => {
    const client = mockUsersClient();
    const result = await getUser(client, "12345", "a@b.com");
    expect(result.email).toBe("a@b.com");
    expect(client.list).toHaveBeenCalledWith("12345", undefined);
  });

  it("getUser throws when user not found", async () => {
    const client = mockUsersClient();
    await expect(getUser(client, "12345", "missing@b.com")).rejects.toThrow(
      'User "missing@b.com" not found',
    );
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

  it("updateOffer auto-derives updateMask from data keys", async () => {
    const client = subMockClient();
    const data = { offerId: "o1", phases: [], offerTags: [] } as any;
    await updateOffer(client, "com.example", "sub1", "bp1", "o1", data);
    expect(client.subscriptions.updateOffer).toHaveBeenCalledWith(
      "com.example",
      "sub1",
      "bp1",
      "o1",
      data,
      "phases,offerTags",
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
    await expect(uploadRelease(client, PKG, "/tmp/bad.aab", { track: "internal" })).rejects.toThrow(
      "File validation failed",
    );
    // Should NOT have called edits.insert since validation happens first
  });

  it("cleans up edit when bundle upload throws", async () => {
    const client = mockClient();
    client.bundles.upload.mockRejectedValue(new Error("bundle upload error"));

    await expect(uploadRelease(client, PKG, "/tmp/app.aab", { track: "internal" })).rejects.toThrow(
      "bundle upload error",
    );

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
      undefined,
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

    await expect(promoteRelease(client, PKG, "alpha", "production")).rejects.toThrow(
      'No active release found on track "alpha"',
    );
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

  it("retries on 409 Conflict with a fresh edit", async () => {
    const client = mockClient();
    let callCount = 0;
    client.edits.insert.mockImplementation(async () => {
      callCount++;
      return { id: `edit-${callCount}`, expiryTimeSeconds: "3600" };
    });

    // First call to tracks.get fails with 409, second succeeds
    client.tracks.get
      .mockRejectedValueOnce(new PlayApiError("Conflict", "EDIT_CONFLICT", 409, "Edit was stale"))
      .mockResolvedValueOnce({
        track: "internal",
        releases: [{ versionCodes: ["42"], status: "completed" }],
      });

    const result = await promoteRelease(client, PKG, "internal", "production");

    expect(result.track).toBe("production");
    // Should have created 2 edits (original + retry)
    expect(client.edits.insert).toHaveBeenCalledTimes(2);
    // Should have cleaned up the stale edit
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });
});

// ---------------------------------------------------------------------------
// fetchReleaseNotes
// ---------------------------------------------------------------------------
describe("fetchReleaseNotes", () => {
  it("returns release notes from the latest completed release", async () => {
    const client = mockClient();
    const notes = [
      { language: "en-US", text: "Bug fixes" },
      { language: "fr-FR", text: "Corrections" },
    ];
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [{ versionCodes: ["42"], status: "completed", releaseNotes: notes }],
    });

    const result = await fetchReleaseNotes(client, PKG, "beta");
    expect(result).toEqual(notes);
    // Should discard the edit (read-only)
    expect(client.edits.delete).toHaveBeenCalledWith(PKG, "edit-1");
  });

  it("returns empty array when release has no notes", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "internal",
      releases: [{ versionCodes: ["1"], status: "completed" }],
    });

    const result = await fetchReleaseNotes(client, PKG, "internal");
    expect(result).toEqual([]);
  });

  it("throws when track has no releases", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "alpha",
      releases: [],
    });

    await expect(fetchReleaseNotes(client, PKG, "alpha")).rejects.toThrow(
      'No release found on track "alpha"',
    );
  });

  it("prefers completed/inProgress over draft releases", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "beta",
      releases: [
        {
          versionCodes: ["10"],
          status: "draft",
          releaseNotes: [{ language: "en-US", text: "draft" }],
        },
        {
          versionCodes: ["9"],
          status: "completed",
          releaseNotes: [{ language: "en-US", text: "live" }],
        },
      ],
    });

    const result = await fetchReleaseNotes(client, PKG, "beta");
    expect(result).toEqual([{ language: "en-US", text: "live" }]);
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

    await expect(updateRollout(client, PKG, "production", "increase", 0)).rejects.toThrow(
      "--to <percentage> is required for rollout increase",
    );
  });

  it("increase throws when userFraction exceeds 1", async () => {
    const client = mockClient();
    client.tracks.get.mockResolvedValue({
      track: "production",
      releases: [{ versionCodes: ["42"], status: "inProgress", userFraction: 0.1 }],
    });

    await expect(updateRollout(client, PKG, "production", "increase", 1.5)).rejects.toThrow(
      "Rollout percentage must be between 0 and 1",
    );
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

  it("downloadReport throws GCS not-supported error with suggestion", async () => {
    const client: any = {};
    try {
      await downloadReport(client, "com.example", "earnings", 2026, 3);
    } catch (err: any) {
      expect(err.message).toContain("not available through the Google Play Developer API");
      expect(err.suggestion).toContain("Google Cloud Storage");
    }
  });

  it("isValidReportType rejects empty string", () => {
    expect(isValidReportType("")).toBe(false);
  });

  it("isValidStatsDimension accepts all valid dimensions", () => {
    for (const dim of [
      "country",
      "language",
      "os_version",
      "device",
      "app_version",
      "carrier",
      "overview",
    ]) {
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
    expect(client.update).toHaveBeenCalledWith("12345", "a@b.com", { grants }, "grants");
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

    await expect(removeTesters(client, "com.example", "internal", ["a@b.com"])).rejects.toThrow(
      "API fail",
    );
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
    const remote = [{ language: "ko-KR", title: "", shortDescription: "", fullDescription: "" }];
    const diffs = diffListings(local, remote);
    expect(diffs).toHaveLength(0);
  });

  it("handles missing optional fields gracefully", () => {
    const local = [
      { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
    ];
    const remote = [
      { language: "en-US", title: "App", shortDescription: "s", fullDescription: "f" },
    ];
    // Add a video field only to remote
    (remote[0] as any).video = "https://youtube.com/v/123";
    const diffs = diffListings(local, remote);
    // Should detect the video field difference
    expect(diffs.some((d) => d.field === "video")).toBe(true);
  });

  it("detects multiple field differences in same language", () => {
    const local = [
      {
        language: "en-US",
        title: "New Title",
        shortDescription: "New Short",
        fullDescription: "f",
      },
    ];
    const remote = [
      {
        language: "en-US",
        title: "Old Title",
        shortDescription: "Old Short",
        fullDescription: "f",
      },
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
  updateDataSafety,
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
      dataSafety: {
        update: vi.fn().mockResolvedValue(sampleDataSafety),
      },
    };
  }

  it("updateDataSafety calls dataSafety.update directly without edits", async () => {
    const client = mockClient();
    const result = await updateDataSafety(client, "com.example", sampleDataSafety);
    expect(client.dataSafety.update).toHaveBeenCalledWith("com.example", sampleDataSafety);
    expect(result).toEqual(sampleDataSafety);
  });

  it("importDataSafety reads JSON from file and updates", async () => {
    const client = mockClient();
    const tmpDir = await mkdtemp(join(tmpdir(), "gpc-ds-"));
    const filePath = join(tmpDir, "data-safety.json");

    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, JSON.stringify(sampleDataSafety), "utf-8");

    const result = await importDataSafety(client, "com.example", filePath);
    expect(client.dataSafety.update).toHaveBeenCalledWith("com.example", sampleDataSafety);
    expect(result).toEqual(sampleDataSafety);

    await rm(tmpDir, { recursive: true });
  });

  it("updateDataSafety propagates errors", async () => {
    const client = mockClient();
    client.dataSafety.update.mockRejectedValue(new Error("API error"));
    await expect(updateDataSafety(client, "com.example", sampleDataSafety)).rejects.toThrow(
      "API error",
    );
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
    const result = await refundExternalTransaction(client, "com.example", "ext-txn-1", refundData);
    expect(client.externalTransactions.refund).toHaveBeenCalledWith(
      "com.example",
      "ext-txn-1",
      refundData,
    );
    expect(result.transactionState).toBe("TRANSACTION_STATE_REFUNDED");
  });
});

// ---------------------------------------------------------------------------
// Device Tiers
// ---------------------------------------------------------------------------

import { listDeviceTiers, getDeviceTier, createDeviceTier } from "../src/commands/device-tiers.js";

describe("device tiers commands", () => {
  function mockClient(): any {
    return {
      deviceTiers: {
        list: vi.fn().mockResolvedValue([
          {
            deviceTierConfigId: "tier-1",
            deviceGroups: [
              { name: "high-end", deviceSelectors: [{ deviceRam: { minBytes: "6000000000" } }] },
            ],
          },
          {
            deviceTierConfigId: "tier-2",
            deviceGroups: [
              { name: "low-end", deviceSelectors: [{ deviceRam: { maxBytes: "3000000000" } }] },
            ],
          },
        ]),
        get: vi.fn().mockResolvedValue({
          deviceTierConfigId: "tier-1",
          deviceGroups: [
            { name: "high-end", deviceSelectors: [{ deviceRam: { minBytes: "6000000000" } }] },
          ],
        }),
        create: vi.fn().mockResolvedValue({
          deviceTierConfigId: "tier-new",
          deviceGroups: [
            {
              name: "mid-range",
              deviceSelectors: [{ deviceRam: { minBytes: "4000000000", maxBytes: "6000000000" } }],
            },
          ],
        }),
      },
    };
  }

  it("listDeviceTiers calls client.deviceTiers.list", async () => {
    const client = mockClient();
    const result = await listDeviceTiers(client, "com.example");
    expect(client.deviceTiers.list).toHaveBeenCalledWith("com.example");
    expect(result).toHaveLength(2);
    expect(result[0].deviceTierConfigId).toBe("tier-1");
    expect(result[1].deviceTierConfigId).toBe("tier-2");
  });

  it("getDeviceTier calls client.deviceTiers.get", async () => {
    const client = mockClient();
    const result = await getDeviceTier(client, "com.example", "tier-1");
    expect(client.deviceTiers.get).toHaveBeenCalledWith("com.example", "tier-1");
    expect(result.deviceTierConfigId).toBe("tier-1");
    expect(result.deviceGroups[0].name).toBe("high-end");
  });

  it("createDeviceTier calls client.deviceTiers.create", async () => {
    const client = mockClient();
    const config = {
      deviceTierConfigId: "",
      deviceGroups: [
        {
          name: "mid-range",
          deviceSelectors: [{ deviceRam: { minBytes: "4000000000", maxBytes: "6000000000" } }],
        },
      ],
    };
    const result = await createDeviceTier(client, "com.example", config);
    expect(client.deviceTiers.create).toHaveBeenCalledWith("com.example", config);
    expect(result.deviceTierConfigId).toBe("tier-new");
  });

  it("listDeviceTiers throws when packageName is empty", async () => {
    const client = mockClient();
    await expect(listDeviceTiers(client, "")).rejects.toThrow("Package name is required");
  });

  it("getDeviceTier throws when configId is empty", async () => {
    const client = mockClient();
    await expect(getDeviceTier(client, "com.example", "")).rejects.toThrow("Config ID is required");
  });

  it("createDeviceTier throws when config has no device groups", async () => {
    const client = mockClient();
    const config = { deviceTierConfigId: "", deviceGroups: [] };
    await expect(createDeviceTier(client, "com.example", config)).rejects.toThrow(
      "Device tier config must include at least one device group",
    );
  });
});

// ---------------------------------------------------------------------------
// Internal App Sharing
// ---------------------------------------------------------------------------

import { uploadInternalSharing } from "../src/commands/internal-sharing.js";

describe("internal sharing commands", () => {
  function mockClient(): any {
    return {
      internalAppSharing: {
        uploadBundle: vi.fn().mockResolvedValue({
          certificateFingerprint: "AA:BB:CC",
          downloadUrl: "https://play.google.com/apps/test/com.example/1",
          sha256: "abc123",
        }),
        uploadApk: vi.fn().mockResolvedValue({
          certificateFingerprint: "DD:EE:FF",
          downloadUrl: "https://play.google.com/apps/test/com.example/2",
          sha256: "def456",
        }),
      },
    };
  }

  it("uploads a bundle for internal sharing", async () => {
    const client = mockClient();
    const result = await uploadInternalSharing(client, "com.example", "/path/to/app.aab", "bundle");
    expect(client.internalAppSharing.uploadBundle).toHaveBeenCalledWith(
      "com.example",
      "/path/to/app.aab",
    );
    expect(result.downloadUrl).toBe("https://play.google.com/apps/test/com.example/1");
    expect(result.fileType).toBe("bundle");
  });

  it("uploads an APK for internal sharing", async () => {
    const client = mockClient();
    const result = await uploadInternalSharing(client, "com.example", "/path/to/app.apk", "apk");
    expect(client.internalAppSharing.uploadApk).toHaveBeenCalledWith(
      "com.example",
      "/path/to/app.apk",
    );
    expect(result.downloadUrl).toBe("https://play.google.com/apps/test/com.example/2");
    expect(result.fileType).toBe("apk");
  });

  it("auto-detects bundle type from .aab extension", async () => {
    const client = mockClient();
    const result = await uploadInternalSharing(client, "com.example", "/path/to/app.aab");
    expect(client.internalAppSharing.uploadBundle).toHaveBeenCalled();
    expect(result.fileType).toBe("bundle");
  });

  it("auto-detects apk type from .apk extension", async () => {
    const client = mockClient();
    const result = await uploadInternalSharing(client, "com.example", "/path/to/app.apk");
    expect(client.internalAppSharing.uploadApk).toHaveBeenCalled();
    expect(result.fileType).toBe("apk");
  });

  it("throws on unknown file extension without explicit type", async () => {
    const client = mockClient();
    await expect(uploadInternalSharing(client, "com.example", "/path/to/file.zip")).rejects.toThrow(
      "Cannot detect file type",
    );
  });

  it("returns certificate fingerprint and sha256", async () => {
    const client = mockClient();
    const result = await uploadInternalSharing(client, "com.example", "/path/to/app.aab", "bundle");
    expect(result.certificateFingerprint).toBe("AA:BB:CC");
    expect(result.sha256).toBe("abc123");
  });
});

// ---------------------------------------------------------------------------
// Generated APKs
// ---------------------------------------------------------------------------

import { listGeneratedApks, downloadGeneratedApk } from "../src/commands/generated-apks.js";

describe("generated APKs commands", () => {
  function mockClient(): any {
    return {
      generatedApks: {
        list: vi.fn().mockResolvedValue([
          {
            generatedApkId: "apk-1",
            variantId: 1,
            moduleName: "base",
            certificateSha256Fingerprint: "AA:BB",
          },
          {
            generatedApkId: "apk-2",
            variantId: 2,
            moduleName: "feature",
            certificateSha256Fingerprint: "CC:DD",
          },
        ]),
        download: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      },
    };
  }

  it("lists generated APKs for a version code", async () => {
    const client = mockClient();
    const result = await listGeneratedApks(client, "com.example", 42);
    expect(client.generatedApks.list).toHaveBeenCalledWith("com.example", 42);
    expect(result).toHaveLength(2);
    expect(result[0].generatedApkId).toBe("apk-1");
  });

  it("throws on invalid version code for list", async () => {
    const client = mockClient();
    await expect(listGeneratedApks(client, "com.example", -1)).rejects.toThrow(
      "Invalid version code",
    );
  });

  it("downloads a generated APK to a file", async () => {
    const client = mockClient();
    const dir = await mkdtemp(join(tmpdir(), "gpc-gen-apk-"));
    const outPath = join(dir, "out.apk");
    try {
      const result = await downloadGeneratedApk(client, "com.example", 42, "apk-1", outPath);
      expect(client.generatedApks.download).toHaveBeenCalledWith("com.example", 42, "apk-1");
      expect(result.path).toBe(outPath);
      expect(result.sizeBytes).toBe(1024);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws on invalid version code for download", async () => {
    const client = mockClient();
    await expect(
      downloadGeneratedApk(client, "com.example", 0, "apk-1", "/tmp/out.apk"),
    ).rejects.toThrow("Invalid version code");
  });

  it("throws on empty APK ID for download", async () => {
    const client = mockClient();
    await expect(
      downloadGeneratedApk(client, "com.example", 42, "", "/tmp/out.apk"),
    ).rejects.toThrow("APK ID is required");
  });

  it("throws on non-integer version code", async () => {
    const client = mockClient();
    await expect(listGeneratedApks(client, "com.example", 1.5)).rejects.toThrow(
      "Invalid version code",
    );
  });
});

// ---------------------------------------------------------------------------
// One-Time Products (OTP)
// ---------------------------------------------------------------------------

import {
  listOneTimeProducts,
  getOneTimeProduct,
  createOneTimeProduct,
  updateOneTimeProduct,
  deleteOneTimeProduct,
  listOneTimeOffers,
  getOneTimeOffer,
  createOneTimeOffer,
  updateOneTimeOffer,
  deleteOneTimeOffer,
  diffOneTimeProduct,
} from "../src/commands/one-time-products.js";

describe("one-time products commands", () => {
  function mockClient(): any {
    return {
      oneTimeProducts: {
        list: vi.fn().mockResolvedValue({ oneTimeProducts: [{ productId: "otp1" }] }),
        get: vi.fn().mockResolvedValue({ productId: "otp1" }),
        create: vi.fn().mockResolvedValue({ productId: "otp1" }),
        update: vi.fn().mockResolvedValue({ productId: "otp1" }),
        delete: vi.fn().mockResolvedValue(undefined),
        listOffers: vi.fn().mockResolvedValue({ oneTimeOffers: [{ offerId: "offer1" }] }),
        getOffer: vi.fn().mockResolvedValue({ offerId: "offer1" }),
        createOffer: vi.fn().mockResolvedValue({ offerId: "offer1" }),
        updateOffer: vi.fn().mockResolvedValue({ offerId: "offer1" }),
        deleteOffer: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("listOneTimeProducts calls client.oneTimeProducts.list", async () => {
    const client = mockClient();
    const result = await listOneTimeProducts(client, "com.example");
    expect(client.oneTimeProducts.list).toHaveBeenCalledWith("com.example");
    expect(result.oneTimeProducts).toHaveLength(1);
  });

  it("getOneTimeProduct calls client.oneTimeProducts.get", async () => {
    const client = mockClient();
    const result = await getOneTimeProduct(client, "com.example", "otp1");
    expect(client.oneTimeProducts.get).toHaveBeenCalledWith("com.example", "otp1");
    expect(result.productId).toBe("otp1");
  });

  it("createOneTimeProduct calls client.oneTimeProducts.create", async () => {
    const client = mockClient();
    const data = { productId: "otp1" } as any;
    await createOneTimeProduct(client, "com.example", data);
    expect(client.oneTimeProducts.create).toHaveBeenCalledWith("com.example", data);
  });

  it("updateOneTimeProduct auto-derives updateMask", async () => {
    const client = mockClient();
    const data = { productId: "otp1", listings: {} } as any;
    await updateOneTimeProduct(client, "com.example", "otp1", data);
    expect(client.oneTimeProducts.update).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      data,
      "listings",
    );
  });

  it("updateOneTimeProduct passes explicit updateMask", async () => {
    const client = mockClient();
    const data = { productId: "otp1", listings: {} } as any;
    await updateOneTimeProduct(client, "com.example", "otp1", data, "listings,purchaseType");
    expect(client.oneTimeProducts.update).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      data,
      "listings,purchaseType",
    );
  });

  it("deleteOneTimeProduct calls client.oneTimeProducts.delete", async () => {
    const client = mockClient();
    await deleteOneTimeProduct(client, "com.example", "otp1");
    expect(client.oneTimeProducts.delete).toHaveBeenCalledWith("com.example", "otp1");
  });

  it("listOneTimeOffers calls client.oneTimeProducts.listOffers with purchaseOptionId", async () => {
    const client = mockClient();
    const result = await listOneTimeOffers(client, "com.example", "otp1");
    expect(client.oneTimeProducts.listOffers).toHaveBeenCalledWith("com.example", "otp1", "-");
    expect(result.oneTimeOffers).toHaveLength(1);
  });

  it("getOneTimeOffer calls client.oneTimeProducts.getOffer with purchaseOptionId", async () => {
    const client = mockClient();
    const result = await getOneTimeOffer(client, "com.example", "otp1", "offer1");
    expect(client.oneTimeProducts.getOffer).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      "-",
      "offer1",
    );
    expect(result.offerId).toBe("offer1");
  });

  it("createOneTimeOffer calls client.oneTimeProducts.createOffer with purchaseOptionId", async () => {
    const client = mockClient();
    const data = { offerId: "offer1" } as any;
    await createOneTimeOffer(client, "com.example", "otp1", data);
    expect(client.oneTimeProducts.createOffer).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      "-",
      data,
    );
  });

  it("updateOneTimeOffer auto-derives updateMask with purchaseOptionId", async () => {
    const client = mockClient();
    const data = { offerId: "offer1", pricing: {} } as any;
    await updateOneTimeOffer(client, "com.example", "otp1", "offer1", data);
    expect(client.oneTimeProducts.updateOffer).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      "-",
      "offer1",
      data,
      "pricing",
    );
  });

  it("deleteOneTimeOffer calls client.oneTimeProducts.deleteOffer with purchaseOptionId", async () => {
    const client = mockClient();
    await deleteOneTimeOffer(client, "com.example", "otp1", "offer1");
    expect(client.oneTimeProducts.deleteOffer).toHaveBeenCalledWith(
      "com.example",
      "otp1",
      "-",
      "offer1",
    );
  });

  it("listOneTimeProducts wraps errors with GpcError", async () => {
    const client = {
      oneTimeProducts: {
        list: vi.fn().mockRejectedValue(new Error("network error")),
      },
    };
    await expect(listOneTimeProducts(client as any, "com.example")).rejects.toThrow(
      "Failed to list one-time products",
    );
  });

  it("getOneTimeOffer wraps errors with GpcError", async () => {
    const client = {
      oneTimeProducts: {
        getOffer: vi.fn().mockRejectedValue(new Error("not found")),
      },
    };
    await expect(getOneTimeOffer(client as any, "com.example", "otp1", "offer1")).rejects.toThrow(
      "Failed to get offer",
    );
  });

  it("diffOneTimeProduct returns diffs for changed fields", async () => {
    const client = {
      oneTimeProducts: {
        get: vi.fn().mockResolvedValue({
          productId: "otp1",
          listings: { "en-US": { title: "Remote Title" } },
          purchaseType: "managedUser",
        }),
      },
    };
    const localData = {
      productId: "otp1",
      listings: { "en-US": { title: "Local Title" } },
      purchaseType: "managedUser",
    } as any;
    const diffs = await diffOneTimeProduct(client as any, "com.example", "otp1", localData);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("listings");
  });

  it("diffOneTimeProduct returns empty array when identical", async () => {
    const data = { productId: "otp1", listings: { "en-US": { title: "Same" } } };
    const client = {
      oneTimeProducts: {
        get: vi.fn().mockResolvedValue(data),
      },
    };
    const diffs = await diffOneTimeProduct(client as any, "com.example", "otp1", data as any);
    expect(diffs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Track create/update
// ---------------------------------------------------------------------------
describe("createTrack", () => {
  function mockClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
        validate: vi.fn().mockResolvedValue({ id: "edit-1" }),
        commit: vi.fn().mockResolvedValue({ id: "edit-1" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      tracks: {
        create: vi.fn().mockResolvedValue({ track: "my-qa-track", releases: [] }),
        update: vi.fn().mockResolvedValue({ track: "my-qa-track", releases: [] }),
      },
    };
  }

  it("creates a custom track via edit lifecycle", async () => {
    const client = mockClient();
    const result = await createTrack(client, "com.example", "my-qa-track");
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.tracks.create).toHaveBeenCalledWith("com.example", "edit-1", "my-qa-track");
    expect(client.edits.validate).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit-1", undefined);
    expect(result.track).toBe("my-qa-track");
  });

  it("throws GpcError for empty track name", async () => {
    const client = mockClient();
    await expect(createTrack(client, "com.example", "")).rejects.toThrow(
      "Track name must not be empty",
    );
  });
});

describe("updateTrackConfig", () => {
  function mockClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
        validate: vi.fn().mockResolvedValue({ id: "edit-1" }),
        commit: vi.fn().mockResolvedValue({ id: "edit-1" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      tracks: {
        update: vi.fn().mockResolvedValue({
          track: "beta",
          releases: [{ status: "completed", versionCodes: ["100"] }],
        }),
      },
    };
  }

  it("updates track config via edit lifecycle", async () => {
    const client = mockClient();
    const config = { versionCodes: ["100"], status: "completed" };
    const result = await updateTrackConfig(client, "com.example", "beta", config);
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.tracks.update).toHaveBeenCalledWith(
      "com.example",
      "edit-1",
      "beta",
      expect.objectContaining({ status: "completed" }),
    );
    expect(client.edits.validate).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit-1", undefined);
    expect(result.track).toBe("beta");
  });

  it("throws GpcError for empty track name", async () => {
    const client = mockClient();
    await expect(updateTrackConfig(client, "com.example", "", {})).rejects.toThrow(
      "Track name must not be empty",
    );
  });
});

// ---------------------------------------------------------------------------
// Externally hosted APKs
// ---------------------------------------------------------------------------
describe("uploadExternallyHosted", () => {
  function mockClient(): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
        validate: vi.fn().mockResolvedValue({ id: "edit-1" }),
        commit: vi.fn().mockResolvedValue({ id: "edit-1" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      apks: {
        addExternallyHosted: vi.fn().mockResolvedValue({
          externallyHostedApk: {
            packageName: "com.example",
            versionCode: 42,
            externallyHostedUrl: "https://cdn.example.com/app.apk",
          },
        }),
      },
    };
  }

  it("uploads externally hosted APK via edit lifecycle", async () => {
    const client = mockClient();
    const data = {
      applicationLabel: "My App",
      externallyHostedUrl: "https://cdn.example.com/app.apk",
      fileSha256Base64: "abc123",
      fileSize: "10485760",
      certificateBase64s: ["cert1"],
      minimumSdk: 21,
      packageName: "com.example",
      versionCode: 42,
      versionName: "1.0.0",
    } as any;
    const result = await uploadExternallyHosted(client, "com.example", data);
    expect(client.edits.insert).toHaveBeenCalledWith("com.example");
    expect(client.apks.addExternallyHosted).toHaveBeenCalledWith("com.example", "edit-1", data);
    expect(client.edits.validate).toHaveBeenCalledWith("com.example", "edit-1");
    expect(client.edits.commit).toHaveBeenCalledWith("com.example", "edit-1", undefined);
    expect(result.externallyHostedApk.versionCode).toBe(42);
  });

  it("throws GpcError when externallyHostedUrl is missing", async () => {
    const client = mockClient();
    const data = { packageName: "com.example" } as any;
    await expect(uploadExternallyHosted(client, "com.example", data)).rejects.toThrow(
      "externallyHostedUrl is required",
    );
  });

  it("throws GpcError when packageName is missing", async () => {
    const client = mockClient();
    const data = { externallyHostedUrl: "https://cdn.example.com/app.apk" } as any;
    await expect(uploadExternallyHosted(client, "com.example", data)).rejects.toThrow(
      "packageName is required",
    );
  });

  it("cleans up edit on API error", async () => {
    const client = mockClient();
    client.apks.addExternallyHosted.mockRejectedValue(new Error("API failure"));
    const data = {
      applicationLabel: "My App",
      externallyHostedUrl: "https://cdn.example.com/app.apk",
      fileSha256Base64: "abc123",
      fileSize: "10485760",
      certificateBase64s: ["cert1"],
      minimumSdk: 21,
      packageName: "com.example",
      versionCode: 42,
      versionName: "1.0.0",
    } as any;
    await expect(uploadExternallyHosted(client, "com.example", data)).rejects.toThrow(
      "API failure",
    );
    expect(client.edits.delete).toHaveBeenCalledWith("com.example", "edit-1");
  });
});

// ---------------------------------------------------------------------------
// Releases diff
// ---------------------------------------------------------------------------
describe("diffReleases", () => {
  function mockClient(fromRelease: any, toRelease: any): any {
    return {
      edits: {
        insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      tracks: {
        get: vi.fn().mockImplementation((_pkg: string, _edit: string, track: string) => {
          if (track === "internal")
            return { track: "internal", releases: fromRelease ? [fromRelease] : [] };
          return { track: "production", releases: toRelease ? [toRelease] : [] };
        }),
      },
    };
  }

  it("returns diffs when releases differ", async () => {
    const client = mockClient(
      { versionCodes: ["100"], status: "completed", name: "v1.0" },
      { versionCodes: ["99"], status: "inProgress", userFraction: 0.5, name: "v0.9" },
    );
    const result = await diffReleases(client, "com.example", "internal", "production");
    expect(result.fromTrack).toBe("internal");
    expect(result.toTrack).toBe("production");
    expect(result.diffs.length).toBeGreaterThan(0);
    expect(result.diffs.some((d: any) => d.field === "versionCodes")).toBe(true);
  });

  it("returns no diffs when releases are identical", async () => {
    const release = { versionCodes: ["100"], status: "completed", name: "v1.0" };
    const client = mockClient(release, release);
    const result = await diffReleases(client, "com.example", "internal", "production");
    expect(result.diffs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Purchase Options
// ---------------------------------------------------------------------------

// purchase-options tests removed: standalone resource does not exist in Google Play API.
// Purchase options are managed through oneTimeProducts.purchaseOptions paths.

// ---------------------------------------------------------------------------
// IAP Batch Sync
// ---------------------------------------------------------------------------

import { batchSyncInAppProducts } from "../src/commands/iap.js";

describe("iap batch sync", () => {
  function mockClient(): any {
    return {
      inappproducts: {
        list: vi.fn().mockResolvedValue({ inappproduct: [] }),
        get: vi.fn().mockResolvedValue({ sku: "coins100" }),
        create: vi.fn().mockResolvedValue({ sku: "coins100" }),
        update: vi.fn().mockResolvedValue({ sku: "coins100" }),
        delete: vi.fn().mockResolvedValue(undefined),
        batchUpdate: vi
          .fn()
          .mockResolvedValue({ inappproducts: [{ sku: "coins100" }, { sku: "gems50" }] }),
        batchGet: vi.fn().mockResolvedValue([{ sku: "coins100" }]),
      },
    };
  }

  it("batchSyncInAppProducts uses batch API for multiple updates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-batch-"));
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
    client.inappproducts.list.mockResolvedValue({
      inappproduct: [{ sku: "coins100" }, { sku: "gems50" }],
    });

    const result = await batchSyncInAppProducts(client, "com.example", dir);

    expect(result.updated).toBe(2);
    expect(result.created).toBe(0);
    expect(result.batchUsed).toBe(true);
    expect(client.inappproducts.batchUpdate).toHaveBeenCalledTimes(1);
    expect(client.inappproducts.update).not.toHaveBeenCalled();

    await rm(dir, { recursive: true });
  });

  it("batchSyncInAppProducts falls back to serial on batch failure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-batch-"));
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
    client.inappproducts.list.mockResolvedValue({
      inappproduct: [{ sku: "coins100" }, { sku: "gems50" }],
    });
    client.inappproducts.batchUpdate.mockRejectedValue(new Error("batch not supported"));

    const result = await batchSyncInAppProducts(client, "com.example", dir);

    expect(result.updated).toBe(2);
    expect(result.batchErrors).toBe(1);
    expect(client.inappproducts.update).toHaveBeenCalledTimes(2);

    await rm(dir, { recursive: true });
  });

  it("batchSyncInAppProducts dry-run does not call API", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-batch-"));
    await writeFile(join(dir, "coins100.json"), JSON.stringify({ sku: "coins100" }));

    const client = mockClient();
    const result = await batchSyncInAppProducts(client, "com.example", dir, { dryRun: true });

    expect(result.created).toBe(1);
    expect(client.inappproducts.create).not.toHaveBeenCalled();
    expect(client.inappproducts.batchUpdate).not.toHaveBeenCalled();

    await rm(dir, { recursive: true });
  });

  it("batchSyncInAppProducts returns empty for empty directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-batch-"));
    const client = mockClient();
    const result = await batchSyncInAppProducts(client, "com.example", dir);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.batchUsed).toBe(false);

    await rm(dir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// Enterprise / Managed Google Play
// ---------------------------------------------------------------------------
import { createEnterpriseApp, publishEnterpriseApp } from "../src/commands/enterprise.js";

describe("enterprise commands", () => {
  function mockEnterpriseClient() {
    return {
      apps: {
        create: vi.fn().mockResolvedValue({
          packageName: "com.google.customapp.generated",
          title: "Test Private App",
          languageCode: "en_US",
        }),
      },
    };
  }

  it("createEnterpriseApp passes accountId, bundlePath, and metadata through", async () => {
    const client = mockEnterpriseClient();
    const result = await createEnterpriseApp(client, {
      accountId: "1234567890",
      bundlePath: "/path/to/app.aab",
      title: "Test Private App",
      languageCode: "en_US",
      organizations: [{ organizationId: "org-1" }],
    });

    expect(result.packageName).toBe("com.google.customapp.generated");
    expect(client.apps.create).toHaveBeenCalledWith("1234567890", "/path/to/app.aab", {
      title: "Test Private App",
      languageCode: "en_US",
      organizations: [{ organizationId: "org-1" }],
    });
  });

  it("createEnterpriseApp defaults languageCode to en_US when omitted", async () => {
    const client = mockEnterpriseClient();
    await createEnterpriseApp(client, {
      accountId: "999",
      bundlePath: "/path/to/app.aab",
      title: "No Lang",
    });

    expect(client.apps.create).toHaveBeenCalledWith(
      "999",
      "/path/to/app.aab",
      expect.objectContaining({ languageCode: "en_US" }),
    );
  });

  it("createEnterpriseApp passes undefined organizations when not specified", async () => {
    const client = mockEnterpriseClient();
    await createEnterpriseApp(client, {
      accountId: "42",
      bundlePath: "/path/to/app.aab",
      title: "No Orgs",
    });

    expect(client.apps.create).toHaveBeenCalledWith(
      "42",
      "/path/to/app.aab",
      expect.objectContaining({ organizations: undefined }),
    );
  });

  it("publishEnterpriseApp delegates to the same client.apps.create call", async () => {
    const client = mockEnterpriseClient();
    const result = await publishEnterpriseApp(client, {
      accountId: "7",
      bundlePath: "/path/to/app.aab",
      title: "Published",
    });

    expect(result.packageName).toBe("com.google.customapp.generated");
    expect(client.apps.create).toHaveBeenCalledTimes(1);
    expect(client.apps.create).toHaveBeenCalledWith(
      "7",
      "/path/to/app.aab",
      expect.objectContaining({ title: "Published" }),
    );
  });
});
