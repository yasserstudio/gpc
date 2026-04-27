/**
 * Self-update logic for `gpc update`.
 *
 * All functions here are pure / testable — no Commander.js dependency.
 * The command layer in commands/update.ts handles output and flags.
 */

import { createWriteStream } from "node:fs";
import { rename, chmod, unlink, stat, readdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { spawn } from "node:child_process";
import { sha256File } from "@gpc-cli/core";
import { isNewerVersion } from "./update-check.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstallMethod = "npm" | "homebrew" | "binary" | "unknown";

export interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GithubRelease {
  tag_name: string;
  html_url: string;
  assets: GithubAsset[];
}

export interface UpdateCheckResult {
  current: string;
  latest: string;
  latestTag: string;
  updateAvailable: boolean;
  installMethod: InstallMethod;
  release: GithubRelease;
}

const GITHUB_API_URL = "https://api.github.com/repos/yasserstudio/gpc/releases/latest";
const GITHUB_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Install method detection
// ---------------------------------------------------------------------------

/**
 * Detect how gpc was installed.
 *
 * Priority:
 *   1. __GPC_BINARY env var (injected by esbuild at compile time) → "binary"
 *   2. npm_config_prefix env var → "npm"
 *   3. realpathSync(process.argv[1]) contains "cellar" or "homebrew" → "homebrew"
 *   4. realpathSync(process.argv[1]) contains "node_modules" → "npm"
 *   5. fallback → "unknown"
 *
 * Using realpathSync(process.argv[1]) instead of shelling to `which gpc`:
 *   - No child process spawn
 *   - Works on Windows without `where.exe`
 *   - Resolves symlinks — critical for Intel Mac Homebrew where the bin path
 *     is a symlink but the real path contains "Cellar"
 */
export function detectInstallMethod(): InstallMethod {
  // 1. Compiled binary — but Homebrew also distributes as compiled binary, check execPath
  if (process.env["__GPC_BINARY"] === "1") {
    try {
      const resolved = realpathSync(process.execPath).toLowerCase();
      if (resolved.includes("cellar") || resolved.includes("homebrew")) return "homebrew";
    } catch {
      /* ignore */
    }
    return "binary";
  }

  // 2. npm global install
  if (process.env["npm_config_prefix"]) return "npm";

  // 3. Resolve symlinks and inspect path
  try {
    const resolved = realpathSync(process.argv[1] ?? "").toLowerCase();
    if (resolved.includes("cellar") || resolved.includes("homebrew")) return "homebrew";
    if (resolved.includes("node_modules")) return "npm";
  } catch {
    // realpathSync can throw if the path doesn't exist — fall through to unknown
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Platform asset mapping
// ---------------------------------------------------------------------------

/**
 * Returns the GitHub release asset name for the current platform/arch,
 * matching the names produced by scripts/build-binary.ts TARGETS map.
 */
export function getPlatformAsset(): string | null {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  switch (process.platform) {
    case "darwin":
      return `gpc-darwin-${arch}`;
    case "linux":
      return `gpc-linux-${arch}`;
    case "win32":
      return "gpc-windows-x64.exe";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Current binary path
// ---------------------------------------------------------------------------

/**
 * Returns the path of the currently running gpc binary.
 * For compiled binaries, process.execPath IS the binary.
 * For npm/dev installs, process.argv[1] is the script entrypoint.
 */
export function getCurrentBinaryPath(): string {
  if (process.env["__GPC_BINARY"] === "1") return process.execPath;
  return process.argv[1] ?? process.execPath;
}

// ---------------------------------------------------------------------------
// GitHub Releases API
// ---------------------------------------------------------------------------

function getGithubToken(): string | undefined {
  return process.env["GPC_GITHUB_TOKEN"] || process.env["GITHUB_TOKEN"] || undefined;
}

function githubApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "gpc-cli",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = getGithubToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function githubDownloadHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "gpc-cli",
  };
  const token = getGithubToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchLatestRelease(): Promise<GithubRelease> {
  let response: Response;
  try {
    response = await fetch(GITHUB_API_URL, {
      headers: githubApiHeaders(),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`Network error checking for updates: ${msg}`), {
      code: "NETWORK_ERROR",
      exitCode: 5,
    });
  }

  if (
    response.status === 429 ||
    (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")
  ) {
    throw Object.assign(
      new Error(
        "GitHub API rate limit exceeded. Set GPC_GITHUB_TOKEN or GITHUB_TOKEN to increase the limit.",
      ),
      {
        code: "UPDATE_RATE_LIMITED",
        exitCode: 4,
        suggestion: "export GPC_GITHUB_TOKEN=ghp_... (a personal access token with no scopes)",
      },
    );
  }

  if (!response.ok) {
    throw Object.assign(new Error(`GitHub API returned HTTP ${response.status}`), {
      code: "UPDATE_API_ERROR",
      exitCode: 4,
    });
  }

  return (await response.json()) as GithubRelease;
}

/**
 * Fetch and parse checksums.txt from the release assets.
 * Returns a Map of filename → lowercase sha256 hex.
 * Returns an empty Map if the asset is missing or the fetch fails.
 */
export async function fetchChecksums(release: GithubRelease): Promise<Map<string, string>> {
  const asset = release.assets.find((a) => a.name === "checksums.txt");
  if (!asset) return new Map();

  try {
    const response = await fetch(asset.browser_download_url, {
      headers: githubDownloadHeaders(),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
    if (!response.ok) return new Map();

    const map = new Map<string, string>();
    for (const line of (await response.text()).split("\n")) {
      const parts = line.trim().split(/\s+/);
      const hash = parts[0];
      const name = parts[1];
      if (hash && name) map.set(name, hash.toLowerCase());
    }
    return map;
  } catch {
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// High-level update check
// ---------------------------------------------------------------------------

export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  const release = await fetchLatestRelease();
  const latest = release.tag_name.replace(/^v/, "");
  return {
    current: currentVersion,
    latest,
    latestTag: release.tag_name,
    updateAvailable: isNewerVersion(currentVersion, latest),
    installMethod: detectInstallMethod(),
    release,
  };
}

// ---------------------------------------------------------------------------
// Update execution paths
// ---------------------------------------------------------------------------

export async function updateViaNpm(options: { silent?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["install", "-g", "@gpc-cli/cli@latest"], {
      // In silent (JSON) mode, redirect npm's stdout to stderr so it doesn't
      // pollute the machine-readable JSON that gpc writes to stdout.
      stdio: options.silent ? ["inherit", process.stderr, process.stderr] : "inherit",
      shell: false,
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          Object.assign(new Error(`npm exited with code ${code}`), {
            code: "UPDATE_NPM_FAILED",
            exitCode: 1,
            suggestion: "Run manually: npm install -g @gpc-cli/cli@latest",
          }),
        );
      }
    });
    proc.on("error", (err) => {
      reject(
        Object.assign(new Error(`Failed to run npm: ${err.message}`), {
          code: "UPDATE_NPM_SPAWN_FAILED",
          exitCode: 1,
          suggestion: "Ensure npm is in your PATH",
        }),
      );
    });
  });
}

export async function updateViaBrew(options: { silent?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("brew", ["upgrade", "yasserstudio/tap/gpc"], {
      // In silent (JSON) mode, redirect brew's stdout to stderr so it doesn't
      // pollute the machine-readable JSON that gpc writes to stdout.
      stdio: options.silent ? ["inherit", process.stderr, process.stderr] : "inherit",
      shell: false,
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          Object.assign(new Error(`brew exited with code ${code}`), {
            code: "UPDATE_BREW_FAILED",
            exitCode: 1,
            suggestion: "Run manually: brew upgrade yasserstudio/tap/gpc",
          }),
        );
      }
    });
    proc.on("error", (err) => {
      reject(
        Object.assign(new Error(`Failed to run brew: ${err.message}`), {
          code: "UPDATE_BREW_SPAWN_FAILED",
          exitCode: 1,
          suggestion: "Ensure Homebrew is installed: https://brew.sh",
        }),
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Binary in-place replace
// ---------------------------------------------------------------------------

function isPermissionError(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err.code === "EACCES" || err.code === "EPERM");
}

// sha256File imported from @gpc-cli/core

/**
 * Clean up stale `.gpc-old-*` and `.gpc-update-*.tmp` files left by
 * previous update attempts (e.g. Windows EBUSY on unlink).
 * Fire-and-forget — errors are silently ignored.
 */
export function cleanupStaleUpdateFiles(binaryPath: string): void {
  const dir = dirname(binaryPath);
  readdir(dir)
    .then((files) => {
      for (const f of files) {
        if (f.startsWith(".gpc-old-") || f.startsWith(".gpc-update-")) {
          unlink(join(dir, f)).catch(() => {});
        }
      }
    })
    .catch(() => {});
}

/**
 * Download a new binary and atomically replace the current one.
 *
 * macOS/Linux: rename(tmp, current) — safe because open files can be replaced
 * Windows:     rename(current, .old) then rename(tmp, current) — avoids EBUSY
 *              because Windows locks running executables
 */
export async function updateBinaryInPlace(
  assetUrl: string,
  expectedSha256: string,
  currentBinaryPath: string,
  options: { onProgress?: (downloaded: number, total: number) => void } = {},
): Promise<void> {
  const dir = dirname(currentBinaryPath);
  const tmpPath = join(dir, `.gpc-update-${process.pid}.tmp`);
  const oldPath = join(dir, `.gpc-old-${process.pid}`);

  try {
    // 1. Download
    let response: Response;
    try {
      response = await fetch(assetUrl, {
        headers: githubDownloadHeaders(),
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw Object.assign(new Error(`Download failed: ${msg}`), {
        code: "UPDATE_DOWNLOAD_FAILED",
        exitCode: 5,
      });
    }

    if (!response.ok) {
      throw Object.assign(new Error(`Download failed: HTTP ${response.status}`), {
        code: "UPDATE_DOWNLOAD_FAILED",
        exitCode: 4,
      });
    }
    if (!response.body) {
      throw Object.assign(new Error("Empty response body"), {
        code: "UPDATE_DOWNLOAD_FAILED",
        exitCode: 4,
      });
    }

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let downloaded = 0;

    const dest = createWriteStream(tmpPath);
    const { onProgress } = options;

    if (onProgress) {
      const tracker = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          downloaded += chunk.length;
          onProgress(downloaded, total);
          cb(null, chunk);
        },
      });
      await pipeline(
        Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
        tracker,
        dest,
      );
    } else {
      await pipeline(
        Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
        dest,
      );
    }

    // 2. Verify checksum (skip if no checksum available)
    if (expectedSha256) {
      const actual = await sha256File(tmpPath);
      if (actual !== expectedSha256.toLowerCase()) {
        throw Object.assign(
          new Error(`Checksum mismatch — expected ${expectedSha256}, got ${actual}`),
          {
            code: "UPDATE_CHECKSUM_MISMATCH",
            exitCode: 1,
            suggestion: "The download may be corrupt. Try again.",
          },
        );
      }
    }

    // 3. Set executable bit (no-op on Windows)
    if (process.platform !== "win32") {
      await chmod(tmpPath, 0o755);
    }

    // 4. Atomic replace
    if (process.platform === "win32") {
      // Windows locks running executables, so we rename the current binary
      // out of the way first, then move the new one into place
      await rename(currentBinaryPath, oldPath);
      try {
        await rename(tmpPath, currentBinaryPath);
      } catch (renameErr) {
        // Roll back — restore original binary
        await rename(oldPath, currentBinaryPath).catch(() => {});
        throw renameErr;
      }
      // Delete the old binary in the background (best-effort)
      unlink(oldPath).catch(() => {});
    } else {
      await rename(tmpPath, currentBinaryPath);
    }
  } catch (err) {
    // Clean up temp file on any error
    await unlink(tmpPath).catch(() => {});

    if (isPermissionError(err)) {
      throw Object.assign(new Error(`Permission denied replacing ${currentBinaryPath}`), {
        code: "UPDATE_PERMISSION_DENIED",
        exitCode: 1,
        suggestion: `Run with elevated permissions: sudo gpc update`,
      });
    }
    throw err;
  }
}
