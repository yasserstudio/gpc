import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateImage } from "../src/utils/image-validation";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("validateImage", () => {
  const testDir = join(tmpdir(), "gpc-test-image-validation");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("accepts valid PNG file", async () => {
    const filePath = join(testDir, "icon.png");
    await writeFile(filePath, Buffer.alloc(100));

    const result = await validateImage(filePath, "icon");

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts valid JPEG file", async () => {
    const filePath = join(testDir, "screenshot.jpg");
    await writeFile(filePath, Buffer.alloc(100));

    const result = await validateImage(filePath, "phoneScreenshots");

    expect(result.valid).toBe(true);
  });

  it("accepts .jpeg extension", async () => {
    const filePath = join(testDir, "photo.jpeg");
    await writeFile(filePath, Buffer.alloc(100));

    const result = await validateImage(filePath);

    expect(result.valid).toBe(true);
  });

  it("rejects unsupported format", async () => {
    const filePath = join(testDir, "image.webp");
    await writeFile(filePath, Buffer.alloc(100));

    const result = await validateImage(filePath);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unsupported image format");
  });

  it("rejects nonexistent file", async () => {
    const result = await validateImage("/does/not/exist.png");

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("not found");
  });

  it("rejects empty file", async () => {
    const filePath = join(testDir, "empty.png");
    await writeFile(filePath, Buffer.alloc(0));

    const result = await validateImage(filePath);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("empty");
  });

  it("rejects icon over 1 MB", async () => {
    const filePath = join(testDir, "big-icon.png");
    await writeFile(filePath, Buffer.alloc(1024 * 1024 + 1));

    const result = await validateImage(filePath, "icon");

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("1 MB limit");
  });

  it("passes screenshot under 8 MB", async () => {
    const filePath = join(testDir, "screenshot.png");
    await writeFile(filePath, Buffer.alloc(1024 * 100));

    const result = await validateImage(filePath, "phoneScreenshots");

    expect(result.valid).toBe(true);
  });

  it("warns about large images over 2 MB", async () => {
    const filePath = join(testDir, "large.jpg");
    await writeFile(filePath, Buffer.alloc(2 * 1024 * 1024 + 1));

    const result = await validateImage(filePath, "phoneScreenshots");

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("optimizing"))).toBe(true);
  });
});
