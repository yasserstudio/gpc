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
    details: { get: vi.fn() },
    bundles: {
      list: vi.fn(),
      upload: vi.fn().mockResolvedValue({ versionCode: 42, sha256: "abc123" }),
    },
    tracks: {
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue({ track: "internal", releases: [] }),
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
