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
      list: vi
        .fn()
        .mockImplementation((_pkg: string, _edit: string, lang: string, type: string) =>
          Promise.resolve(remoteImages[`${lang}/${type}`] ?? []),
        ),
      upload: vi.fn().mockResolvedValue(makeImage("new", "newsha")),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn().mockResolvedValue([]),
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
    // Orphan removal now clears the combo with one deleteAll, not a per-image delete.
    expect(client.images.deleteAll).toHaveBeenCalledWith(PKG, "edit1", "en-US", "icon");
    expect(client.images.delete).not.toHaveBeenCalled();
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
    vi.mocked(client.images.deleteAll).mockImplementation(async () => {
      callOrder.push("deleteAll");
      return [];
    });
    vi.mocked(client.images.upload).mockImplementation(async () => {
      callOrder.push("upload");
      return makeImage("new", "new-hash");
    });

    await syncImages(client, PKG, tmp, { delete: true });
    expect(callOrder).toEqual(["deleteAll", "upload"]);
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

  it("--delete skips when local matches remote in the same order", async () => {
    const a = "slide-a";
    const b = "slide-b";
    const hashA = await sha256(a);
    const hashB = await sha256(b);
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", a);
    await writeImage(tmp, "en-US", "phoneScreenshots", "2.png", b);

    const client = mockClient({
      "en-US/phoneScreenshots": [makeImage("img1", hashA), makeImage("img2", hashB)],
    });

    const result = await syncImages(client, PKG, tmp, { delete: true });
    expect(result.skipped).toBe(2);
    expect(result.uploaded).toBe(0);
    expect(result.deleted).toBe(0);
    expect(client.images.upload).not.toHaveBeenCalled();
    expect(client.images.delete).not.toHaveBeenCalled();
    expect(client.edits.commit).not.toHaveBeenCalled();
  });

  it("--delete fully replaces when the same images are in a different order", async () => {
    const a = "slide-a";
    const b = "slide-b";
    const hashA = await sha256(a);
    const hashB = await sha256(b);
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", a);
    await writeImage(tmp, "en-US", "phoneScreenshots", "2.png", b);

    // Remote holds the same two images but in reversed display order.
    const client = mockClient({
      "en-US/phoneScreenshots": [makeImage("img1", hashB), makeImage("img2", hashA)],
    });

    const result = await syncImages(client, PKG, tmp, { delete: true });
    expect(result.deleted).toBe(2);
    expect(result.uploaded).toBe(2);
    expect(result.skipped).toBe(0);
    // One deleteAll for the whole combo, not a per-image delete loop.
    expect(client.images.deleteAll).toHaveBeenCalledTimes(1);
    expect(client.images.delete).not.toHaveBeenCalled();
    // Re-uploaded in sorted filename order: 1.png then 2.png.
    const uploadedOrder = vi
      .mocked(client.images.upload)
      .mock.calls.map((c) => (c[4] as string).split(/[\\/]/).pop());
    expect(uploadedOrder).toEqual(["1.png", "2.png"]);
  });

  it("--delete preserves display order on a partial change ([A,B,C,D,E], only B changes)", async () => {
    const a = "slide-a";
    const b = "slide-b";
    const c = "slide-c";
    const d = "slide-d";
    const e = "slide-e";
    const bPrime = "slide-b-prime";
    // Local set in sorted filename order 1..5 is A, B', C, D, E.
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", a);
    await writeImage(tmp, "en-US", "phoneScreenshots", "2.png", bPrime);
    await writeImage(tmp, "en-US", "phoneScreenshots", "3.png", c);
    await writeImage(tmp, "en-US", "phoneScreenshots", "4.png", d);
    await writeImage(tmp, "en-US", "phoneScreenshots", "5.png", e);

    // Remote holds the OLD set A, B, C, D, E in order -- only position 2 differs.
    const client = mockClient({
      "en-US/phoneScreenshots": [
        makeImage("img1", await sha256(a)),
        makeImage("img2", await sha256(b)),
        makeImage("img3", await sha256(c)),
        makeImage("img4", await sha256(d)),
        makeImage("img5", await sha256(e)),
      ],
    });

    const result = await syncImages(client, PKG, tmp, { delete: true });
    // Hash sequence differs at position 2, so the combo is replaced in full and in order.
    expect(result.deleted).toBe(5);
    expect(result.uploaded).toBe(5);
    expect(client.images.deleteAll).toHaveBeenCalledTimes(1);
    const order = vi
      .mocked(client.images.upload)
      .mock.calls.map((call) => (call[4] as string).split(/[\\/]/).pop());
    // Final display order is A, B', C, D, E -- not A, C, D, E, B' (the old set-diff bug).
    expect(order).toEqual(["1.png", "2.png", "3.png", "4.png", "5.png"]);
  });

  it("--delete leaves remote types with no local directory untouched (no accidental icon wipe)", async () => {
    // Local has only phoneScreenshots; there is no local icon/ directory at all.
    await writeImage(tmp, "en-US", "phoneScreenshots", "1.png", "shot");
    const client = mockClient({
      "en-US/icon": [makeImage("icon1", "iconhash")],
      "en-US/phoneScreenshots": [makeImage("ps1", await sha256("shot"))],
    });

    const result = await syncImages(client, PKG, tmp, { delete: true });

    // The absent icon/ directory must NOT trigger a wipe of the remote icon.
    expect(client.images.deleteAll).not.toHaveBeenCalled();
    expect(client.images.delete).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
    expect(
      result.details.some(
        (d) =>
          d.imageType === "icon" && d.action === "skip" && /no local directory/.test(d.reason ?? ""),
      ),
    ).toBe(true);
  });

  it("--delete clears a remote combo when the local directory is present but empty", async () => {
    // Explicit intent: the icon/ directory exists locally but is empty.
    await mkdir(join(tmp, "en-US", "icon"), { recursive: true });
    const client = mockClient({
      "en-US/icon": [makeImage("icon1", "iconhash")],
    });

    const result = await syncImages(client, PKG, tmp, { delete: true });

    expect(client.images.deleteAll).toHaveBeenCalledWith(PKG, "edit1", "en-US", "icon");
    expect(result.deleted).toBe(1);
    expect(result.uploaded).toBe(0);
  });
});
