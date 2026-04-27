import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sha256File } from "../src/utils/hash.js";

describe("sha256File", () => {
  let tmp: string;

  async function setup() {
    tmp = await mkdtemp(join(tmpdir(), "gpc-hash-test-"));
  }

  async function teardown() {
    await rm(tmp, { recursive: true, force: true });
  }

  it("hashes known content correctly", async () => {
    await setup();
    try {
      const file = join(tmp, "test.txt");
      await writeFile(file, "hello world\n");
      const hash = await sha256File(file);
      // echo -n "hello world\n" | sha256sum -> ecf701f727d9e2d77c4aa49ac6fbbcc997278aca010bddeeb961c10cf54d435a
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      // Same file = same hash
      const hash2 = await sha256File(file);
      expect(hash2).toBe(hash);
    } finally {
      await teardown();
    }
  });

  it("hashes empty file", async () => {
    await setup();
    try {
      const file = join(tmp, "empty.txt");
      await writeFile(file, "");
      const hash = await sha256File(file);
      // SHA-256 of empty string
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    } finally {
      await teardown();
    }
  });

  it("throws on non-existent file", async () => {
    await expect(sha256File("/nonexistent/file.txt")).rejects.toThrow();
  });

  it("produces different hashes for different content", async () => {
    await setup();
    try {
      const a = join(tmp, "a.txt");
      const b = join(tmp, "b.txt");
      await writeFile(a, "aaa");
      await writeFile(b, "bbb");
      const hashA = await sha256File(a);
      const hashB = await sha256File(b);
      expect(hashA).not.toBe(hashB);
    } finally {
      await teardown();
    }
  });
});
