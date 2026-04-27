import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncImages } from "../src/commands/image-sync.js";
import type { PlayApiClient, Image, ImageType } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";

const PKG = "com.example.app";

function makeImage(id: string, sha256: string): Image {
  return { id, url: `https://example.com/${id}`, sha1: "unused", sha256 };
}

function mockClient(remoteImages: Record<string, Image[]> = {}) {
  return {
    edits: {
      insert: vi.fn().mockResolvedValue({ id: "edit1", expiryTimeSeconds: "9999999999" }),
      delete: vi.fn().mockResolvedValue(undefined),
      validate: vi.fn().mockResolvedValue({}),
      commit: vi.fn().mockResolvedValue({}),
    },
    images: {
      list: vi.fn().mockImplementation(
        (_pkg: string, _edit: string, lang: string, type: string) =>
          Promise.resolve(remoteImages[`${lang}/${type}`] ?? []),
      ),
      upload: vi.fn().mockResolvedValue(makeImage("new", "newsha")),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as PlayApiClient;
}

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "gpc-img-sync-"));
}

async function writeImage(dir: string, lang: string, type: string, name: string, content: string) {
  const imgDir = join(dir, lang, type);
  await mkdir(imgDir, { recursive: true });
  await writeFile(join(imgDir, name), content);
}

async function sha256(content: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(content).digest("hex");
}

describe("syncImages", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await createTempDir();
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("skips all images when SHA-256 matches", async () => {
    const content = "identical-image-bytes";
    const hash = await sha256(content);
    await writeImage(tmp, "en-US", "icon", "1.png", content);

    const client = mockClient({
      "en-US/icon": [makeImage("img1", hash)],
    });

    const result = await syncImages(client, PKG, tmp);
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
    expect(result.deleted).toBe(0);
    expect(client.images.upload).not.toHaveBeenCalled();
    expect(client.edits.commit).not.toHaveBeenCalled();
    expect(client.edits.delete).toHaveBeenCalled();
  });

  it("matches SHA-256 case-insensitively", async () => {
    const content = "test-content";
    const hash = await sha256(content);
    await writeImage(tmp, "en-US", "icon", "1.png", content);

    const client = mockClient({
      "en-US/icon": [makeImage("img1", hash.toUpperCase())],
    });

    const result = await syncImages(client, PKG, tmp);
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
  });

  it("uploads changed images", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "new-content");

    const client = mockClient({
      "en-US/icon": [makeImage("img1", "old-different-hash")],
    });

    const result = await syncImages(client, PKG, tmp);
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(client.images.upload).toHaveBeenCalledTimes(1);
    expect(client.edits.validate).toHaveBeenCalled();
    expect(client.edits.commit).toHaveBeenCalled();
  });

  it("uploads new images when remote is empty", async () => {
    await writeImage(tmp, "ja", "phoneScreenshots", "1.png", "screenshot");

    const client = mockClient();
    const result = await syncImages(client, PKG, tmp);
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(client.images.upload).toHaveBeenCalledTimes(1);
  });

  it("deletes remote-only images when --delete is set", async () => {
    const client = mockClient({
      "en-US/icon": [makeImage("orphan", "orphan-hash")],
    });
    await mkdir(join(tmp, "en-US", "icon"), { recursive: true });

    const result = await syncImages(client, PKG, tmp, { delete: true });
    expect(result.deleted).toBe(1);
    expect(client.images.delete).toHaveBeenCalledWith(PKG, "edit1", "en-US", "icon", "orphan");
  });

  it("does not delete remote-only images by default", async () => {
    const client = mockClient({
      "en-US/icon": [makeImage("orphan", "orphan-hash")],
    });
    await mkdir(join(tmp, "en-US", "icon"), { recursive: true });

    const result = await syncImages(client, PKG, tmp);
    expect(result.deleted).toBe(0);
    expect(client.images.delete).not.toHaveBeenCalled();
  });

  it("deletes before uploading to avoid image count limits", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "new-image");
    const client = mockClient({
      "en-US/icon": [makeImage("old", "old-hash")],
    });

    const callOrder: string[] = [];
    vi.mocked(client.images.delete).mockImplementation(async () => {
      callOrder.push("delete");
    });
    vi.mocked(client.images.upload).mockImplementation(async () => {
      callOrder.push("upload");
      return makeImage("new", "new-hash");
    });

    await syncImages(client, PKG, tmp, { delete: true });
    expect(callOrder).toEqual(["delete", "upload"]);
  });

  it("dry run produces correct result without API mutations", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "new-image");

    const client = mockClient();
    const result = await syncImages(client, PKG, tmp, { dryRun: true });
    expect(result.uploaded).toBe(1);
    expect(client.images.upload).not.toHaveBeenCalled();
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("handles empty local directory gracefully", async () => {
    await expect(syncImages(mockClient(), PKG, tmp)).rejects.toThrow("No language directories");
  });

  it("filters by --lang option", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "en");
    await writeImage(tmp, "ja", "icon", "1.png", "ja");

    const client = mockClient();
    const result = await syncImages(client, PKG, tmp, { lang: "en-US" });
    expect(result.uploaded).toBe(1);
    expect(result.details.every((d) => d.language === "en-US")).toBe(true);
  });

  it("filters by --type option", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "icon");
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", "screenshot");

    const client = mockClient();
    const result = await syncImages(client, PKG, tmp, { type: "icon" as ImageType });
    expect(result.uploaded).toBe(1);
    expect(result.details.every((d) => d.imageType === "icon")).toBe(true);
  });

  it("commits once for entire sync", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "a");
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", "b");
    await writeImage(tmp, "ja", "icon", "1.png", "c");

    const client = mockClient();
    const result = await syncImages(client, PKG, tmp);
    expect(result.uploaded).toBe(3);
    expect(client.edits.commit).toHaveBeenCalledTimes(1);
    expect(client.edits.insert).toHaveBeenCalledTimes(1);
  });

  it("mixed skip and upload in same type", async () => {
    const existing = "existing-content";
    const existingHash = await sha256(existing);
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", existing);
    await writeImage(tmp, "en-US", "phoneScreenshots", "2.png", "brand-new");

    const client = mockClient({
      "en-US/phoneScreenshots": [makeImage("img1", existingHash)],
    });

    const result = await syncImages(client, PKG, tmp);
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(1);
  });

  it("cleans up edit on upload failure", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "fail-content");

    const client = mockClient();
    vi.mocked(client.images.upload).mockRejectedValueOnce(new Error("upload failed"));

    await expect(syncImages(client, PKG, tmp)).rejects.toThrow("upload failed");
    expect(client.edits.delete).toHaveBeenCalled();
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("propagates non-404 errors from images.list", async () => {
    await writeImage(tmp, "en-US", "icon", "1.png", "content");

    const client = mockClient();
    const authError = new PlayApiError("unauthorized", "API_AUTH_ERROR", 401);
    vi.mocked(client.images.list).mockRejectedValueOnce(authError);

    await expect(syncImages(client, PKG, tmp)).rejects.toThrow("unauthorized");
  });
});
