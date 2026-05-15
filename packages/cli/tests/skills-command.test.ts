import { describe, it, expect, vi, afterEach } from "vitest";
import { discoverInstalledSkills, fetchLatestPackVersion } from "../src/commands/skills.js";
import * as fsp from "node:fs/promises";

vi.mock("node:fs/promises", async (importOriginal) => {
  const orig = (await importOriginal()) as Record<string, unknown>;
  return { ...orig };
});

describe("discoverInstalledSkills", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("discovers gpc-* skills with version from SKILL.md", async () => {
    vi.spyOn(fsp, "readdir").mockResolvedValueOnce([
      "gpc-release-flow",
      "gpc-setup",
      "other-skill",
    ] as unknown as Awaited<ReturnType<typeof fsp.readdir>>);
    vi.spyOn(fsp, "readFile")
      .mockResolvedValueOnce(
        "---\nname: gpc-release-flow\nmetadata:\n  version: 1.5.0\n---\nContent",
      )
      .mockResolvedValueOnce("---\nname: gpc-setup\nmetadata:\n  version: 1.4.0\n---\nContent");

    const skills = await discoverInstalledSkills("/fake/skills");
    expect(skills).toHaveLength(2);
    expect(skills[0]!.name).toBe("gpc-release-flow");
    expect(skills[0]!.version).toBe("1.5.0");
    expect(skills[1]!.name).toBe("gpc-setup");
    expect(skills[1]!.version).toBe("1.4.0");
  });

  it("returns empty array when no gpc-* skills exist", async () => {
    vi.spyOn(fsp, "readdir").mockResolvedValueOnce([
      "other-skill",
      "readme.md",
    ] as unknown as Awaited<ReturnType<typeof fsp.readdir>>);
    const skills = await discoverInstalledSkills("/fake/skills");
    expect(skills).toHaveLength(0);
  });

  it("returns empty array when directory does not exist", async () => {
    vi.spyOn(fsp, "readdir").mockRejectedValueOnce(new Error("ENOENT"));
    const skills = await discoverInstalledSkills("/nonexistent");
    expect(skills).toHaveLength(0);
  });

  it("skips skills with unreadable SKILL.md", async () => {
    vi.spyOn(fsp, "readdir").mockResolvedValueOnce(["gpc-broken", "gpc-good"] as unknown as Awaited<
      ReturnType<typeof fsp.readdir>
    >);
    vi.spyOn(fsp, "readFile")
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValueOnce("---\nname: gpc-good\nmetadata:\n  version: 1.0.0\n---\n");

    const skills = await discoverInstalledSkills("/fake/skills");
    expect(skills).toHaveLength(1);
    expect(skills[0]!.name).toBe("gpc-good");
  });

  it("handles missing version in frontmatter", async () => {
    vi.spyOn(fsp, "readdir").mockResolvedValueOnce(["gpc-no-version"] as unknown as Awaited<
      ReturnType<typeof fsp.readdir>
    >);
    vi.spyOn(fsp, "readFile").mockResolvedValueOnce("---\nname: gpc-no-version\n---\nContent");

    const skills = await discoverInstalledSkills("/fake/skills");
    expect(skills).toHaveLength(1);
    expect(skills[0]!.version).toBe("unknown");
  });
});

describe("fetchLatestPackVersion", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns version from GitHub API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v1.20.0" }),
    }) as unknown as typeof fetch;

    const version = await fetchLatestPackVersion("yasserstudio/gpc-skills");
    expect(version).toBe("1.20.0");
  });

  it("strips leading v from tag", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: "v2.0.0" }),
    }) as unknown as typeof fetch;

    const version = await fetchLatestPackVersion();
    expect(version).toBe("2.0.0");
  });

  it("returns null when GitHub API fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as unknown as typeof fetch;
    const version = await fetchLatestPackVersion();
    expect(version).toBeNull();
  });

  it("returns null on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    const version = await fetchLatestPackVersion();
    expect(version).toBeNull();
  });
});
