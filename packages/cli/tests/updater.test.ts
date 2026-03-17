import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock node:fs so realpathSync is controllable
// ---------------------------------------------------------------------------
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    realpathSync: vi.fn().mockReturnValue("/usr/local/bin/gpc"),
  };
});

import {
  detectInstallMethod,
  getPlatformAsset,
  getCurrentBinaryPath,
  fetchLatestRelease,
  fetchChecksums,
  checkForUpdate,
  type GithubRelease,
} from "../src/updater";
import { realpathSync } from "node:fs";

const mockRealpathSync = vi.mocked(realpathSync);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRelease(tag = "v0.9.30"): GithubRelease {
  return {
    tag_name: tag,
    html_url: `https://github.com/yasserstudio/gpc/releases/tag/${tag}`,
    assets: [
      {
        name: "gpc-darwin-arm64",
        browser_download_url: `https://github.com/yasserstudio/gpc/releases/download/${tag}/gpc-darwin-arm64`,
        size: 61_000_000,
      },
      {
        name: "checksums.txt",
        browser_download_url: `https://github.com/yasserstudio/gpc/releases/download/${tag}/checksums.txt`,
        size: 320,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// detectInstallMethod
// ---------------------------------------------------------------------------

describe("detectInstallMethod", () => {
  const origBinary = process.env["__GPC_BINARY"];
  const origNpmPrefix = process.env["npm_config_prefix"];

  beforeEach(() => {
    delete process.env["__GPC_BINARY"];
    delete process.env["npm_config_prefix"];
    mockRealpathSync.mockReturnValue("/usr/local/bin/gpc");
  });

  afterEach(() => {
    if (origBinary !== undefined) process.env["__GPC_BINARY"] = origBinary;
    else delete process.env["__GPC_BINARY"];
    if (origNpmPrefix !== undefined) process.env["npm_config_prefix"] = origNpmPrefix;
    else delete process.env["npm_config_prefix"];
  });

  it('returns "binary" when __GPC_BINARY=1', () => {
    process.env["__GPC_BINARY"] = "1";
    expect(detectInstallMethod()).toBe("binary");
  });

  it('returns "npm" when npm_config_prefix is set', () => {
    process.env["npm_config_prefix"] = "/usr/local";
    expect(detectInstallMethod()).toBe("npm");
  });

  it('returns "homebrew" when resolved path contains "Cellar" (Intel Mac)', () => {
    mockRealpathSync.mockReturnValue("/usr/local/Cellar/gpc/0.9.29/bin/gpc");
    expect(detectInstallMethod()).toBe("homebrew");
  });

  it('returns "homebrew" when resolved path contains "homebrew" (Apple Silicon)', () => {
    mockRealpathSync.mockReturnValue("/opt/homebrew/bin/gpc");
    expect(detectInstallMethod()).toBe("homebrew");
  });

  it('returns "homebrew" case-insensitively', () => {
    mockRealpathSync.mockReturnValue("/opt/Homebrew/bin/gpc");
    expect(detectInstallMethod()).toBe("homebrew");
  });

  it('returns "npm" when resolved path contains "node_modules"', () => {
    mockRealpathSync.mockReturnValue("/usr/local/lib/node_modules/@gpc-cli/cli/dist/bin.js");
    expect(detectInstallMethod()).toBe("npm");
  });

  it('returns "unknown" when no signals match', () => {
    mockRealpathSync.mockReturnValue("/usr/local/bin/gpc");
    expect(detectInstallMethod()).toBe("unknown");
  });

  it('returns "unknown" when realpathSync throws', () => {
    mockRealpathSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(detectInstallMethod()).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// getPlatformAsset
// ---------------------------------------------------------------------------

describe("getPlatformAsset", () => {
  it("returns darwin-arm64 asset on darwin/arm64", () => {
    vi.stubEnv("", ""); // ensure no env interference
    const orig = { platform: process.platform, arch: process.arch };
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
    Object.defineProperty(process, "arch", { value: "arm64", configurable: true });
    expect(getPlatformAsset()).toBe("gpc-darwin-arm64");
    Object.defineProperty(process, "platform", { value: orig.platform, configurable: true });
    Object.defineProperty(process, "arch", { value: orig.arch, configurable: true });
  });

  it("returns darwin-x64 asset on darwin/x64", () => {
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
    Object.defineProperty(process, "arch", { value: "x64", configurable: true });
    expect(getPlatformAsset()).toBe("gpc-darwin-x64");
    Object.defineProperty(process, "platform", { value: process.platform, configurable: true });
    Object.defineProperty(process, "arch", { value: process.arch, configurable: true });
  });

  it("returns linux-x64 asset on linux/x64", () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    Object.defineProperty(process, "arch", { value: "x64", configurable: true });
    expect(getPlatformAsset()).toBe("gpc-linux-x64");
  });

  it("returns windows-x64.exe on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    Object.defineProperty(process, "arch", { value: "x64", configurable: true });
    expect(getPlatformAsset()).toBe("gpc-windows-x64.exe");
  });

  it("returns null for unsupported platform", () => {
    Object.defineProperty(process, "platform", { value: "freebsd", configurable: true });
    expect(getPlatformAsset()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchLatestRelease
// ---------------------------------------------------------------------------

describe("fetchLatestRelease", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    // Restore process values changed by getPlatformAsset tests
    Object.defineProperty(process, "platform", {
      value: process.platform,
      configurable: true,
    });
  });

  it("parses tag_name and assets from a successful response", async () => {
    const release = makeMockRelease("v0.9.30");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => release,
    } as Response);

    const result = await fetchLatestRelease();
    expect(result.tag_name).toBe("v0.9.30");
    expect(result.assets).toHaveLength(2);
  });

  it("throws a network error (exitCode 5) when fetch rejects", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(fetchLatestRelease()).rejects.toMatchObject({ exitCode: 5 });
  });

  it("throws with exitCode 4 on HTTP 429 (rate limited)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    await expect(fetchLatestRelease()).rejects.toMatchObject({
      exitCode: 4,
      code: "UPDATE_RATE_LIMITED",
    });
  });

  it("throws with exitCode 4 on other non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response);
    await expect(fetchLatestRelease()).rejects.toMatchObject({ exitCode: 4 });
  });
});

// ---------------------------------------------------------------------------
// fetchChecksums
// ---------------------------------------------------------------------------

describe("fetchChecksums", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses checksums.txt into a Map (two-space separator)", async () => {
    const checksumContent = [
      "54a016dd2fba8a43bc0c924b2a920bb90d2fc4ba36cb7b7511db53051366e55b  gpc-darwin-arm64",
      "82064a5115a4e2cd650d7fa6ef1e0f895f9b0dc8d2ab27169f7060b437123bba  gpc-darwin-x64",
      "",
    ].join("\n");

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => checksumContent,
    } as Response);

    const map = await fetchChecksums(makeMockRelease());
    expect(map.get("gpc-darwin-arm64")).toBe(
      "54a016dd2fba8a43bc0c924b2a920bb90d2fc4ba36cb7b7511db53051366e55b",
    );
    expect(map.get("gpc-darwin-x64")).toBe(
      "82064a5115a4e2cd650d7fa6ef1e0f895f9b0dc8d2ab27169f7060b437123bba",
    );
  });

  it("returns an empty Map when checksums.txt asset is missing", async () => {
    const releaseWithoutChecksums: GithubRelease = {
      ...makeMockRelease(),
      assets: [makeMockRelease().assets[0]!],
    };
    const map = await fetchChecksums(releaseWithoutChecksums);
    expect(map.size).toBe(0);
  });

  it("returns an empty Map when fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    const map = await fetchChecksums(makeMockRelease());
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkForUpdate
// ---------------------------------------------------------------------------

describe("checkForUpdate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env["__GPC_BINARY"];
    delete process.env["npm_config_prefix"];
    mockRealpathSync.mockReturnValue("/usr/local/bin/gpc");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns updateAvailable: false when already on latest", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makeMockRelease("v0.9.29"),
    } as Response);

    const result = await checkForUpdate("0.9.29");
    expect(result.updateAvailable).toBe(false);
    expect(result.current).toBe("0.9.29");
    expect(result.latest).toBe("0.9.29");
  });

  it("returns updateAvailable: true with correct fields when newer version exists", async () => {
    process.env["npm_config_prefix"] = "/usr/local";
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makeMockRelease("v0.9.30"),
    } as Response);

    const result = await checkForUpdate("0.9.29");
    expect(result.updateAvailable).toBe(true);
    expect(result.latest).toBe("0.9.30");
    expect(result.latestTag).toBe("v0.9.30");
    expect(result.installMethod).toBe("npm");
  });
});
