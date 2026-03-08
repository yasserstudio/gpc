import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scaffoldPlugin } from "../src/commands/plugin-scaffold";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("scaffoldPlugin", () => {
  const testDir = join(tmpdir(), "gpc-test-scaffold");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates all expected files", async () => {
    const dir = join(testDir, "gpc-plugin-test");
    const result = await scaffoldPlugin({ name: "test", dir });

    expect(result.files).toContain("package.json");
    expect(result.files).toContain("tsconfig.json");
    expect(result.files).toContain("src/index.ts");
    expect(result.files).toContain("tests/plugin.test.ts");
  });

  it("generates valid package.json", async () => {
    const dir = join(testDir, "gpc-plugin-hello");
    await scaffoldPlugin({ name: "hello", dir });

    const content = await readFile(join(dir, "package.json"), "utf-8");
    const pkg = JSON.parse(content);

    expect(pkg.name).toBe("gpc-plugin-hello");
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.type).toBe("module");
    expect(pkg.peerDependencies["@gpc/plugin-sdk"]).toBeDefined();
    expect(pkg.keywords).toContain("gpc-plugin");
  });

  it("generates src/index.ts with definePlugin", async () => {
    const dir = join(testDir, "gpc-plugin-notify");
    await scaffoldPlugin({ name: "notify", dir });

    const content = await readFile(join(dir, "src", "index.ts"), "utf-8");
    expect(content).toContain('import { definePlugin }');
    expect(content).toContain('"gpc-plugin-notify"');
    expect(content).toContain("hooks.beforeCommand");
    expect(content).toContain("hooks.afterCommand");
  });

  it("generates test file", async () => {
    const dir = join(testDir, "gpc-plugin-test2");
    await scaffoldPlugin({ name: "test2", dir });

    const content = await readFile(join(dir, "tests", "plugin.test.ts"), "utf-8");
    expect(content).toContain("gpc-plugin-test2");
    expect(content).toContain("registers without errors");
  });

  it("uses custom description", async () => {
    const dir = join(testDir, "gpc-plugin-custom");
    await scaffoldPlugin({ name: "custom", dir, description: "My custom plugin" });

    const content = await readFile(join(dir, "package.json"), "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.description).toBe("My custom plugin");
  });

  it("handles name already prefixed with gpc-plugin-", async () => {
    const dir = join(testDir, "gpc-plugin-prefixed");
    await scaffoldPlugin({ name: "gpc-plugin-prefixed", dir });

    const content = await readFile(join(dir, "package.json"), "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe("gpc-plugin-prefixed");
  });

  it("returns the directory path", async () => {
    const dir = join(testDir, "gpc-plugin-path");
    const result = await scaffoldPlugin({ name: "path", dir });
    expect(result.dir).toBe(dir);
  });
});
