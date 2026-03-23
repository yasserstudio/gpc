import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initProject } from "../src/commands/init";

describe("initProject", () => {
  const tmpDir = join(tmpdir(), "gpc-test-init");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates .gpcrc.json with default package name", async () => {
    const result = await initProject({ dir: tmpDir });
    expect(result.created).toContain(join(tmpDir, ".gpcrc.json"));

    const content = JSON.parse(await readFile(join(tmpDir, ".gpcrc.json"), "utf-8"));
    expect(content.app).toBe("com.example.app");
    expect(content.output).toBe("table");
  });

  it("creates .gpcrc.json with custom package name", async () => {
    await initProject({ dir: tmpDir, app: "com.mycompany.myapp" });
    const content = JSON.parse(await readFile(join(tmpDir, ".gpcrc.json"), "utf-8"));
    expect(content.app).toBe("com.mycompany.myapp");
  });

  it("creates .preflightrc.json with defaults", async () => {
    const result = await initProject({ dir: tmpDir });
    expect(result.created).toContain(join(tmpDir, ".preflightrc.json"));

    const content = JSON.parse(await readFile(join(tmpDir, ".preflightrc.json"), "utf-8"));
    expect(content.failOn).toBe("error");
    expect(content.targetSdkMinimum).toBe(35);
  });

  it("creates metadata directory with listing files", async () => {
    await initProject({ dir: tmpDir });

    const metaDir = join(tmpDir, "metadata", "android", "en-US");
    const s = await stat(metaDir);
    expect(s.isDirectory()).toBe(true);

    // Listing files exist (empty)
    await expect(stat(join(metaDir, "title.txt"))).resolves.toBeTruthy();
    await expect(stat(join(metaDir, "short_description.txt"))).resolves.toBeTruthy();
    await expect(stat(join(metaDir, "full_description.txt"))).resolves.toBeTruthy();
  });

  it("creates phoneScreenshots directory with .gitkeep", async () => {
    await initProject({ dir: tmpDir });
    const ssDir = join(tmpDir, "metadata", "android", "en-US", "images", "phoneScreenshots");
    await expect(stat(ssDir)).resolves.toBeTruthy();
    await expect(stat(join(ssDir, ".gitkeep"))).resolves.toBeTruthy();
  });

  it("skips existing files by default", async () => {
    await writeFile(join(tmpDir, ".gpcrc.json"), '{"app":"existing"}');

    const result = await initProject({ dir: tmpDir });
    expect(result.skipped).toContain(join(tmpDir, ".gpcrc.json"));
    expect(result.created).not.toContain(join(tmpDir, ".gpcrc.json"));

    // Original content preserved
    const content = await readFile(join(tmpDir, ".gpcrc.json"), "utf-8");
    expect(content).toBe('{"app":"existing"}');
  });

  it("overwrites when skipExisting is false", async () => {
    await writeFile(join(tmpDir, ".gpcrc.json"), '{"app":"old"}');

    const result = await initProject({ dir: tmpDir, skipExisting: false });
    expect(result.created).toContain(join(tmpDir, ".gpcrc.json"));

    const content = JSON.parse(await readFile(join(tmpDir, ".gpcrc.json"), "utf-8"));
    expect(content.app).toBe("com.example.app");
  });

  it("generates GitHub Actions workflow", async () => {
    const result = await initProject({ dir: tmpDir, app: "com.test.app", ci: "github" });
    const workflowPath = join(tmpDir, ".github", "workflows", "gpc-release.yml");
    expect(result.created).toContain(workflowPath);

    const content = await readFile(workflowPath, "utf-8");
    expect(content).toContain("GPC Release");
    expect(content).toContain("com.test.app");
    expect(content).toContain("gpc preflight");
    expect(content).toContain("gpc releases upload");
  });

  it("generates GitLab CI pipeline", async () => {
    const result = await initProject({ dir: tmpDir, ci: "gitlab" });
    const pipelinePath = join(tmpDir, ".gitlab-ci-gpc.yml");
    expect(result.created).toContain(pipelinePath);

    const content = await readFile(pipelinePath, "utf-8");
    expect(content).toContain("GPC Release Pipeline");
    expect(content).toContain("gpc preflight");
  });

  it("does not generate CI template when ci is undefined", async () => {
    const result = await initProject({ dir: tmpDir });
    expect(result.created.every((f) => !f.includes("workflow") && !f.includes("gitlab"))).toBe(
      true,
    );
  });

  it("returns correct counts", async () => {
    const result = await initProject({ dir: tmpDir, ci: "github" });
    // .gpcrc.json + .preflightrc.json + 4 listing files + .gitkeep + workflow = 8
    expect(result.created.length).toBe(8);
    expect(result.skipped.length).toBe(0);
  });
});
