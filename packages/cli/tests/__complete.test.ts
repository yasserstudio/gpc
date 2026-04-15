import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runContext,
  completeProfiles,
  completePackages,
  completeTracksForApp,
  completeReleasesForTrack,
} from "../src/commands/__complete";

/**
 * Isolate the filesystem by pointing XDG dirs at a tmpdir for each test,
 * then writing real files. Cheaper than mocking and exercises the same code
 * path the shell invokes.
 */

let tmpRoot: string;
let configDir: string;
let cacheDir: string;
let cwdDir: string;
let savedXdgConfig: string | undefined;
let savedXdgCache: string | undefined;
let savedCwd: string;

async function writeUserConfig(body: Record<string, unknown>): Promise<void> {
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "config.json"), JSON.stringify(body), "utf-8");
}

async function writeProjectConfig(body: Record<string, unknown>): Promise<void> {
  await writeFile(join(cwdDir, ".gpcrc.json"), JSON.stringify(body), "utf-8");
}

async function writeStatusCache(
  packageName: string,
  data: Record<string, unknown>,
  ageSec = 0,
): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  const fetchedAt = new Date(Date.now() - ageSec * 1000).toISOString();
  const entry = { fetchedAt, ttl: 3600, data };
  await writeFile(
    join(cacheDir, `status-${packageName}.json`),
    JSON.stringify(entry),
    "utf-8",
  );
}

beforeEach(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), "gpc-complete-"));
  configDir = join(tmpRoot, "config", "gpc");
  cacheDir = join(tmpRoot, "cache", "gpc");
  cwdDir = join(tmpRoot, "cwd");
  await mkdir(cwdDir, { recursive: true });
  savedXdgConfig = process.env["XDG_CONFIG_HOME"];
  savedXdgCache = process.env["XDG_CACHE_HOME"];
  savedCwd = process.cwd();
  process.env["XDG_CONFIG_HOME"] = join(tmpRoot, "config");
  process.env["XDG_CACHE_HOME"] = join(tmpRoot, "cache");
  process.chdir(cwdDir);
});

afterEach(async () => {
  process.chdir(savedCwd);
  if (savedXdgConfig === undefined) delete process.env["XDG_CONFIG_HOME"];
  else process.env["XDG_CONFIG_HOME"] = savedXdgConfig;
  if (savedXdgCache === undefined) delete process.env["XDG_CACHE_HOME"];
  else process.env["XDG_CACHE_HOME"] = savedXdgCache;
  await rm(tmpRoot, { recursive: true, force: true });
});

describe("__complete profiles", () => {
  it("returns empty when no config exists", async () => {
    expect(await completeProfiles()).toEqual([]);
  });

  it("returns profile names from user config", async () => {
    await writeUserConfig({
      profiles: { visioo: { app: "tv.visioo.app" }, jowee: { app: "com.jowee.app" } },
    });
    const result = await completeProfiles();
    expect(result.sort()).toEqual(["jowee", "visioo"]);
  });
});

describe("__complete packages", () => {
  it("returns empty when no sources populated", async () => {
    expect(await completePackages()).toEqual([]);
  });

  it("merges main app, profile apps, and cached status files", async () => {
    await writeUserConfig({
      app: "com.user.default",
      profiles: { p1: { app: "com.profile.one" }, p2: { app: "com.profile.two" } },
    });
    await writeProjectConfig({ app: "com.project.app" });
    await writeStatusCache("com.cached.app", { releases: [] });

    const result = await completePackages();
    expect(result).toContain("com.user.default");
    expect(result).toContain("com.profile.one");
    expect(result).toContain("com.profile.two");
    expect(result).toContain("com.project.app");
    expect(result).toContain("com.cached.app");
    // Alphabetically sorted
    expect(result).toEqual([...result].sort());
  });

  it("deduplicates when same package appears in multiple sources", async () => {
    await writeUserConfig({ app: "com.same.app" });
    await writeProjectConfig({ app: "com.same.app" });
    await writeStatusCache("com.same.app", { releases: [] });
    expect(await completePackages()).toEqual(["com.same.app"]);
  });
});

describe("__complete tracks-for-app", () => {
  it("returns static tracks when no package given", async () => {
    const result = await completeTracksForApp(undefined);
    expect(result).toEqual(["production", "beta", "alpha", "internal"]);
  });

  it("returns static tracks when cache missing for package", async () => {
    const result = await completeTracksForApp("com.not.cached");
    expect(result).toEqual(["production", "beta", "alpha", "internal"]);
  });

  it("adds custom track names from fresh cache", async () => {
    await writeStatusCache("com.example.app", {
      releases: [
        { track: "production", versionCode: "10" },
        { track: "custom-qa", versionCode: "11" },
      ],
    });
    const result = await completeTracksForApp("com.example.app");
    expect(result).toContain("custom-qa");
    expect(result).toContain("production");
    expect(result).toContain("beta");
  });

  it("ignores stale cache (silent fallback to static)", async () => {
    // TTL is 3600s; write with age of 4000s → stale
    await writeStatusCache(
      "com.example.app",
      { releases: [{ track: "custom-qa", versionCode: "1" }] },
      4000,
    );
    const result = await completeTracksForApp("com.example.app");
    expect(result).not.toContain("custom-qa");
    expect(result).toEqual(["production", "beta", "alpha", "internal"]);
  });
});

describe("__complete releases-for-track", () => {
  it("returns empty when args missing", async () => {
    expect(await completeReleasesForTrack(undefined, "production")).toEqual([]);
    expect(await completeReleasesForTrack("com.a", undefined)).toEqual([]);
  });

  it("returns empty when cache missing", async () => {
    expect(await completeReleasesForTrack("com.not.cached", "production")).toEqual([]);
  });

  it("returns version codes for the matching track only", async () => {
    await writeStatusCache("com.example.app", {
      releases: [
        { track: "production", versionCode: "100" },
        { track: "production", versionCode: "101" },
        { track: "beta", versionCode: "200" },
      ],
    });
    expect(await completeReleasesForTrack("com.example.app", "production")).toEqual([
      "100",
      "101",
    ]);
    expect(await completeReleasesForTrack("com.example.app", "beta")).toEqual(["200"]);
  });

  it("returns empty when cache is stale", async () => {
    await writeStatusCache(
      "com.example.app",
      { releases: [{ track: "production", versionCode: "100" }] },
      4000,
    );
    expect(await completeReleasesForTrack("com.example.app", "production")).toEqual([]);
  });
});

describe("__complete runContext dispatcher", () => {
  it("dispatches to the right context", async () => {
    await writeUserConfig({ profiles: { foo: { app: "com.foo.app" } } });
    expect(await runContext("profiles")).toEqual(["foo"]);
  });

  it("returns empty array for unknown context", async () => {
    expect(await runContext("bogus")).toEqual([]);
  });
});
