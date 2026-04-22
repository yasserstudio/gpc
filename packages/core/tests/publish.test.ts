import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock file validation
vi.mock("../src/utils/file-validation.js", () => ({
  validateUploadFile: vi.fn().mockResolvedValue({
    valid: true,
    fileType: "aab",
    sizeBytes: 1024,
    errors: [],
    warnings: [],
  }),
}));

import { publish } from "../src/commands/publish";
import { validateUploadFile } from "../src/utils/file-validation";

const mockedValidate = vi.mocked(validateUploadFile);

function mockClient() {
  return {
    edits: {
      insert: vi.fn().mockResolvedValue({ id: "edit-1", expiryTimeSeconds: "9999" }),
      get: vi.fn(),
      validate: vi.fn().mockResolvedValue({ id: "edit-1" }),
      commit: vi.fn().mockResolvedValue({ id: "edit-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    bundles: {
      list: vi.fn().mockResolvedValue([{ versionCode: 42 }]),
      upload: vi.fn().mockResolvedValue({ versionCode: 42, sha1: "a", sha256: "b" }),
    },
    tracks: {
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue({ track: "internal", releases: [] }),
    },
    deobfuscation: {
      upload: vi.fn().mockResolvedValue({ symbolType: "proguard" }),
    },
  } as any;
}

describe("publish", () => {
  const testDir = join(tmpdir(), "gpc-test-publish");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    mockedValidate.mockResolvedValue({
      valid: true,
      fileType: "aab",
      sizeBytes: 1024,
      errors: [],
      warnings: [],
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("validates then uploads on success", async () => {
    const client = mockClient();

    const result = await publish(client, "com.example", "/tmp/app.aab", {
      track: "internal",
      notes: "Bug fixes",
    });

    expect(result.validation.valid).toBe(true);
    expect(result.upload).toBeDefined();
    expect(result.upload!.versionCode).toBe(42);
    expect(result.upload!.track).toBe("internal");
  });

  it("returns early when validation fails (no API calls)", async () => {
    mockedValidate.mockResolvedValue({
      valid: false,
      fileType: "unknown",
      sizeBytes: 0,
      errors: ["Invalid file"],
      warnings: [],
    });

    const client = mockClient();

    const result = await publish(client, "com.example", "/bad.zip", {
      track: "internal",
    });

    expect(result.validation.valid).toBe(false);
    expect(result.upload).toBeUndefined();
    expect(client.edits.insert).not.toHaveBeenCalled();
  });

  it("passes mapping file through to upload", async () => {
    const mappingPath = join(testDir, "mapping.txt");
    await writeFile(mappingPath, "proguard mapping");
    const client = mockClient();

    await publish(client, "com.example", "/tmp/app.aab", {
      track: "internal",
      mappingFile: mappingPath,
    });

    expect(client.deobfuscation.upload).toHaveBeenCalledWith(
      "com.example",
      "edit-1",
      42,
      mappingPath,
      undefined,
    );
  });

  it("defaults to internal track", async () => {
    const client = mockClient();

    const result = await publish(client, "com.example", "/tmp/app.aab", {});

    expect(result.upload!.track).toBe("internal");
  });

  it("passes rollout percentage as userFraction", async () => {
    const client = mockClient();

    await publish(client, "com.example", "/tmp/app.aab", {
      track: "production",
      rolloutPercent: 10,
    });

    expect(client.tracks.update).toHaveBeenCalledWith(
      "com.example",
      "edit-1",
      "production",
      expect.objectContaining({ userFraction: 0.1 }),
    );
  });
});
