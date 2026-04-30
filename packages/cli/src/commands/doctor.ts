import type { Command } from "commander";
import { loadConfig, getCacheDir, getConfigDir } from "@gpc-cli/config";
import { green, red, yellow } from "../colors.js";
import { resolveAuth, AuthError } from "@gpc-cli/auth";
import { existsSync, accessSync, statSync, constants } from "node:fs";
import { readFile, readdir, stat, statfs } from "node:fs/promises";
import { resolve, join } from "node:path";
import { lookup } from "node:dns/promises";
import { isNewerVersion } from "../update-check.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  message: string;
  suggestion?: string;
  /** Structured data for applyFix — avoids fragile regex on suggestion text. */
  fixData?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PASS = "\u2713";
const FAIL = "\u2717";
const WARN = "\u26A0";
const INFO = "-";

const ANDROID_PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** All user-facing keys accepted in .gpcrc.json / config.json. */
const KNOWN_CONFIG_KEYS = new Set([
  "app",
  "output",
  "profile",
  "auth",
  "developerId",
  "plugins",
  "profiles",
  "approvedPlugins",
  "webhooks",
  "debug",
  "train",
]);

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@gpc-cli/cli/latest";
const API_HOST = "androidpublisher.googleapis.com";
const REPORTING_HOST = "playdeveloperreporting.googleapis.com";
const SA_KEY_ROTATION_DAYS = 90;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function icon(status: CheckResult["status"]): string {
  switch (status) {
    case "pass":
      return green(PASS);
    case "fail":
      return red(FAIL);
    case "warn":
      return yellow(WARN);
    case "info":
      return INFO;
  }
}

// ---------------------------------------------------------------------------
// Pure, testable check helpers
// ---------------------------------------------------------------------------

export function checkNodeVersion(nodeVersion: string): CheckResult {
  const major = parseInt(nodeVersion.split(".")[0] ?? "0", 10);
  return major >= 20
    ? { name: "node", status: "pass", message: `Node.js ${nodeVersion}` }
    : {
        name: "node",
        status: "fail",
        message: `Node.js ${nodeVersion} (requires >=20)`,
        suggestion: "Upgrade Node.js to v20 or later: https://nodejs.org",
      };
}

export function checkPackageName(app: string | undefined): CheckResult | null {
  if (!app) return null;
  return ANDROID_PACKAGE_RE.test(app)
    ? { name: "package-name", status: "pass", message: `Package name format OK: ${app}` }
    : {
        name: "package-name",
        status: "warn",
        message: `Package name may be invalid: ${app}`,
        suggestion:
          "Android package names must have 2+ dot-separated segments, each starting with a letter (e.g. com.example.app)",
      };
}

export function checkProxy(url: string | undefined): CheckResult | null {
  if (!url) return null;
  try {
    new URL(url);
    return { name: "proxy", status: "pass", message: `Proxy configured: ${url}` };
  } catch {
    return {
      name: "proxy",
      status: "warn",
      message: `Invalid proxy URL: ${url}`,
      suggestion: "Set HTTPS_PROXY to a valid URL (e.g. http://proxy.example.com:8080)",
    };
  }
}

export function checkDeveloperId(id: string | undefined): CheckResult | null {
  if (!id) return null;
  if (/^\d+$/.test(id)) {
    return { name: "developer-id", status: "pass", message: `Developer ID: ${id}` };
  }
  return {
    name: "developer-id",
    status: "warn",
    message: `Developer ID may be invalid: ${id}`,
    suggestion:
      "Developer IDs are numeric. Find yours at: Play Console → Settings → Developer account → Developer ID",
  };
}

export function checkConflictingCredentials(configSaPath?: string): CheckResult | null {
  const sources: string[] = [];
  if (configSaPath) sources.push("config file (auth.serviceAccount)");
  if (process.env["GPC_SERVICE_ACCOUNT"]) sources.push("GPC_SERVICE_ACCOUNT env var");
  if (process.env["GOOGLE_APPLICATION_CREDENTIALS"])
    sources.push("GOOGLE_APPLICATION_CREDENTIALS env var");

  if (sources.length <= 1) return null;
  return {
    name: "credentials-conflict",
    status: "warn",
    message: `Multiple credential sources: ${sources.join(", ")}`,
    suggestion:
      "GPC uses the first match: config file → GPC_SERVICE_ACCOUNT → GOOGLE_APPLICATION_CREDENTIALS → ADC. Remove unused sources to avoid confusion.",
  };
}

export function checkConfigKeys(config: Record<string, unknown>): CheckResult | null {
  const unknown = Object.keys(config).filter((k) => !KNOWN_CONFIG_KEYS.has(k));
  if (unknown.length === 0) return null;
  return {
    name: "config-keys",
    status: "warn",
    message: `Unknown config key${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`,
    suggestion: `Valid keys: ${[...KNOWN_CONFIG_KEYS].sort().join(", ")}`,
    fixData: { keys: unknown.join(", ") },
  };
}

export function checkCiEnvironment(): CheckResult | null {
  if (!process.env["CI"]) return null;

  let platform = "Unknown CI";
  if (process.env["GITHUB_ACTIONS"]) platform = "GitHub Actions";
  else if (process.env["GITLAB_CI"]) platform = "GitLab CI";
  else if (process.env["BITBUCKET_PIPELINE_UUID"]) platform = "Bitbucket Pipelines";
  else if (process.env["CIRCLECI"]) platform = "CircleCI";
  else if (process.env["JENKINS_URL"]) platform = "Jenkins";
  else if (process.env["TRAVIS"]) platform = "Travis CI";
  else if (process.env["CODEBUILD_BUILD_ID"]) platform = "AWS CodeBuild";
  else if (process.env["BUILD_BUILDID"]) platform = "Azure Pipelines";

  const tips: string[] = [];
  if (!process.env["GPC_NO_COLOR"]) tips.push("Set GPC_NO_COLOR=1 for clean logs");
  if (!process.env["GPC_NO_UPDATE_CHECK"])
    tips.push("Set GPC_NO_UPDATE_CHECK=1 to skip update checks");

  return {
    name: "ci",
    status: "info",
    message: `CI detected: ${platform}`,
    suggestion: tips.length > 0 ? tips.join(". ") : undefined,
  };
}

// ---------------------------------------------------------------------------
// Async check helpers
// ---------------------------------------------------------------------------

async function checkGpcVersion(): Promise<CheckResult> {
  const currentVersion = process.env["__GPC_VERSION"] ?? "0.0.0";
  if (currentVersion === "0.0.0") {
    return { name: "version", status: "info", message: "GPC development build" };
  }
  try {
    const resp = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return { name: "version", status: "pass", message: `GPC v${currentVersion}` };
    const body = (await resp.json()) as { version?: string };
    if (!body.version)
      return { name: "version", status: "pass", message: `GPC v${currentVersion}` };

    if (isNewerVersion(currentVersion, body.version)) {
      return {
        name: "version",
        status: "warn",
        message: `GPC v${currentVersion} (v${body.version} available)`,
        suggestion: "Run: gpc update",
      };
    }
    return {
      name: "version",
      status: "pass",
      message: `GPC v${currentVersion} (up to date)`,
    };
  } catch {
    return { name: "version", status: "pass", message: `GPC v${currentVersion}` };
  }
}

async function checkDiskSpace(dir: string): Promise<CheckResult> {
  try {
    const stats = await statfs(dir);
    const availableGB = (Number(stats.bavail) * Number(stats.bsize)) / 1024 ** 3;
    if (availableGB < 0.1) {
      return {
        name: "disk-space",
        status: "warn",
        message: `Low disk space: ${availableGB.toFixed(1)} GB available`,
        suggestion: "Free up disk space — AAB uploads can be up to 2 GB",
      };
    }
    return {
      name: "disk-space",
      status: "pass",
      message: `Disk space: ${availableGB.toFixed(1)} GB available`,
    };
  } catch {
    // statfs may fail on some filesystems (network mounts, etc.)
    return { name: "disk-space", status: "info", message: "Could not check disk space" };
  }
}

async function checkSaKeyAge(saPath: string): Promise<CheckResult | null> {
  try {
    const stats = await stat(saPath);
    const ageDays = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));
    if (ageDays > SA_KEY_ROTATION_DAYS) {
      return {
        name: "service-account-age",
        status: "warn",
        message: `Service account key is ${ageDays} days old`,
        suggestion: `Google recommends rotating service account keys every ${SA_KEY_ROTATION_DAYS} days`,
      };
    }
    return null; // Don't clutter output when key is fresh
  } catch {
    return null;
  }
}

async function checkTokenCache(cacheDir: string): Promise<CheckResult | null> {
  const cachePath = join(cacheDir, "token-cache.json");
  try {
    if (!existsSync(cachePath)) return null;
    const content = await readFile(cachePath, "utf-8");
    JSON.parse(content);
    return { name: "token-cache", status: "pass", message: "Token cache OK" };
  } catch {
    return {
      name: "token-cache",
      status: "warn",
      message: "Token cache is corrupt",
      suggestion: "Clear with: gpc cache clear",
      fixData: { path: cachePath },
    };
  }
}

async function probeHttps(
  host: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  // Use fetch (undici under the hood) instead of raw tls.connect so the probe
  // exercises the same HTTP stack as every real API call the rest of GPC
  // makes. A raw tls.connect would bypass any configured undici dispatcher,
  // HTTPS_PROXY, NODE_EXTRA_CA_CERTS injection, or TLS-intercepting corporate
  // proxy — and report a misleading "self-signed certificate" failure on
  // hosts that the actual API calls reach fine. Any HTTP response (including
  // 4xx/5xx) proves we successfully talked to the host; only fetch-level
  // errors (network, DNS, TLS) indicate real connectivity problems.
  const start = performance.now();
  try {
    const response = await fetch(`https://${host}/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    // Consume (and discard) any response body to let the connection close
    // cleanly without leaking the stream.
    await response.body?.cancel?.().catch(() => {});
    const latencyMs = Math.round(performance.now() - start);
    return { ok: true, latencyMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // AbortSignal.timeout fires with a TimeoutError name.
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    return {
      ok: false,
      latencyMs: 0,
      error: isTimeout ? "Connection timed out" : message,
    };
  }
}

async function checkAppAccess(packageName: string, accessToken: string): Promise<CheckResult> {
  try {
    const insertResp = await fetch(
      `https://${API_HOST}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!insertResp.ok) {
      const body = (await insertResp.json().catch(() => ({}))) as {
        error?: { message?: string; status?: string };
      };

      // API not enabled in GCP project
      if (
        body.error?.status === "PERMISSION_DENIED" &&
        body.error?.message?.includes("has not been used")
      ) {
        return {
          name: "app-access",
          status: "fail",
          message: "Google Play Android Developer API is not enabled",
          suggestion:
            "Enable it: https://console.cloud.google.com/apis/api/androidpublisher.googleapis.com",
        };
      }

      if (insertResp.status === 403) {
        return {
          name: "app-access",
          status: "fail",
          message: `No access to ${packageName}`,
          suggestion:
            "Grant the service account access in Google Play Console → Users and permissions",
        };
      }
      if (insertResp.status === 404) {
        return {
          name: "app-access",
          status: "fail",
          message: `App not found: ${packageName}`,
          suggestion: "Check the package name with: gpc config get app",
        };
      }
      return {
        name: "app-access",
        status: "fail",
        message: `App access check failed: HTTP ${insertResp.status}`,
        suggestion: body.error?.message ?? "Check your credentials and app configuration",
      };
    }

    // Clean up the test edit
    const edit = (await insertResp.json()) as { id?: string };
    if (edit.id) {
      await fetch(
        `https://${API_HOST}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${edit.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(5000),
        },
      ).catch(() => {});
    }

    return {
      name: "app-access",
      status: "pass",
      message: `App access verified: ${packageName}`,
    };
  } catch (err) {
    return {
      name: "app-access",
      status: "warn",
      message: `Could not verify app access: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Enterprise / Play Custom App Publishing API probe
// ---------------------------------------------------------------------------

/**
 * Best-effort probe of the Play Custom App Publishing API.
 *
 * The Custom App API only exposes `accounts.customApps.create` (POST). There's
 * no read-only endpoint to probe with, so we issue a GET against the collection
 * URL — which the API doesn't support. The response code reveals what we can
 * and can't do:
 *
 *  - 400 / 404 / 405  → API reachable, auth working, permission likely present
 *  - 403              → "create and publish private apps" permission is missing
 *  - 401              → auth misconfigured (already caught by other doctor checks)
 *  - network/timeout  → inconclusive, return info status
 *
 * This is best-effort. A passing result doesn't guarantee `gpc enterprise publish`
 * will succeed against a specific enterprise — that also depends on organization
 * membership. A failing result is a reliable signal that setup is incomplete.
 */
async function checkEnterpriseAccess(accessToken: string): Promise<CheckResult> {
  try {
    // Use account ID "1" as a harmless syntactic placeholder. We expect this
    // to be rejected (404 or 400), which tells us the API is reachable and
    // our auth is recognized.
    const response = await fetch(
      "https://playcustomapp.googleapis.com/playcustomapp/v1/accounts/1/customApps",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; status?: string };
      };

      // API not enabled in this Google Cloud project
      if (body.error?.message?.includes("has not been used")) {
        return {
          name: "enterprise-access",
          status: "warn",
          message: "Play Custom App Publishing API is not enabled for this project",
          suggestion:
            "Enable it (only required for `gpc enterprise publish`): https://console.cloud.google.com/apis/library/playcustomapp.googleapis.com",
        };
      }

      return {
        name: "enterprise-access",
        status: "warn",
        message: "Service account is missing the 'create and publish private apps' permission",
        suggestion:
          "In Play Console → Users and permissions, grant this service account the 'create and publish private apps' account-level permission. Only required if you use `gpc enterprise publish`.",
      };
    }

    // 400 / 404 / 405 = API reachable, auth working, permission likely present.
    // Google returns 400 for invalid account IDs once it gets past auth/permission.
    if (response.status === 400 || response.status === 404 || response.status === 405) {
      return {
        name: "enterprise-access",
        status: "pass",
        message: "Play Custom App Publishing API is reachable",
      };
    }

    // 401 = auth problem; let other doctor checks flag that.
    if (response.status === 401) {
      return {
        name: "enterprise-access",
        status: "info",
        message: "Enterprise API probe skipped (auth not ready)",
      };
    }

    // Any other status — inconclusive, don't fail the doctor run.
    return {
      name: "enterprise-access",
      status: "info",
      message: `Enterprise API probe inconclusive (HTTP ${response.status})`,
      suggestion: "This probe is best-effort. Run `gpc enterprise publish` to verify end-to-end.",
    };
  } catch (err) {
    return {
      name: "enterprise-access",
      status: "info",
      message: `Enterprise API probe skipped: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Verification deadline check
// ---------------------------------------------------------------------------

const VERIFICATION_ENFORCEMENT = new Date("2026-09-30");

export function checkVerificationDeadline(): CheckResult {
  const daysLeft = Math.ceil(
    (VERIFICATION_ENFORCEMENT.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft > 0) {
    return {
      name: "verification",
      status: daysLeft <= 90 ? "warn" : "info",
      message: `Android developer verification enforcement begins September 30, 2026 (${daysLeft} days, BR/ID/SG/TH)`,
      suggestion:
        "Run 'gpc verify' for details or 'gpc verify checklist' for a readiness walkthrough",
    };
  }
  return {
    name: "verification",
    status: "warn",
    message: "Android developer verification is being enforced. Ensure your account is verified.",
    suggestion: "Run 'gpc verify checklist' to check your readiness",
  };
}

// ---------------------------------------------------------------------------
// Stale cache check
// ---------------------------------------------------------------------------

export async function checkStaleCache(cacheDir: string): Promise<CheckResult | null> {
  const STALE_DAYS = 7;
  try {
    if (!existsSync(cacheDir)) return null;
    const files = await readdir(cacheDir);
    const statusFiles = files.filter((f) => f.startsWith("status-") && f.endsWith(".json"));
    if (statusFiles.length === 0) return null;

    const stale: string[] = [];
    for (const file of statusFiles) {
      const filePath = join(cacheDir, file);
      const stats = await stat(filePath);
      const ageDays = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));
      if (ageDays > STALE_DAYS) {
        stale.push(file.replace("status-", "").replace(".json", ""));
      }
    }

    if (stale.length === 0) return null;
    return {
      name: "stale-cache",
      status: "warn",
      message: `Stale status cache (>${STALE_DAYS} days): ${stale.join(", ")}`,
      suggestion: "Refresh with: gpc status --refresh",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shell completion check
// ---------------------------------------------------------------------------

export async function checkShellCompletion(): Promise<CheckResult | null> {
  const shell = process.env["SHELL"] ?? "";
  if (!shell) return null;

  const home = process.env["HOME"] ?? "";
  if (!home) return null;

  const shellName = shell.split("/").pop() ?? "";
  let installed = false;

  if (shellName === "zsh") {
    const rcPath = join(home, ".zshrc");
    try {
      if (existsSync(rcPath)) {
        const rc = await readFile(rcPath, "utf-8");
        const fpath = process.env["FPATH"] ?? "";
        installed = rc.includes("gpc") && (rc.includes("compdef") || fpath.includes("gpc"));
      }
    } catch {
      // fall through
    }
  } else if (shellName === "bash") {
    const rcPath = join(home, ".bashrc");
    try {
      if (existsSync(rcPath)) {
        const rc = await readFile(rcPath, "utf-8");
        installed = rc.includes("gpc") && rc.includes("complete");
      }
    } catch {
      // fall through
    }
  } else {
    return null;
  }

  if (installed) {
    return { name: "shell-completion", status: "pass", message: `Shell completion: ${shellName}` };
  }
  return {
    name: "shell-completion",
    status: "info",
    message: `Shell completion not detected for ${shellName}`,
    suggestion: "Install with: gpc completion install",
  };
}

// ---------------------------------------------------------------------------
// Quota proximity check
// ---------------------------------------------------------------------------

export async function checkQuotaProximity(): Promise<CheckResult | null> {
  try {
    const { getQuotaUsage } = await import("@gpc-cli/core");
    const usage = await getQuotaUsage();

    if (usage.dailyCallsUsed === 0) return null;
    if (usage.dailyCallsLimit === 0 || usage.minuteCallsLimit === 0) return null;

    const minutePct = usage.minuteCallsUsed / usage.minuteCallsLimit;
    if (minutePct > 0.8) {
      return {
        name: "quota",
        status: "warn",
        message: `Per-minute quota: ${usage.minuteCallsUsed}/${usage.minuteCallsLimit} (${Math.round(minutePct * 100)}%)`,
        suggestion:
          "You are approaching the per-minute rate limit. Space out API calls or wait before retrying.",
      };
    }

    const dailyPct = usage.dailyCallsUsed / usage.dailyCallsLimit;
    if (dailyPct > 0.8) {
      return {
        name: "quota",
        status: "warn",
        message: `Daily quota: ${usage.dailyCallsUsed}/${usage.dailyCallsLimit} (${Math.round(dailyPct * 100)}%)`,
        suggestion: "You are approaching the daily API call limit. Monitor usage with: gpc quota status",
      };
    }

    return {
      name: "quota",
      status: "pass",
      message: `Quota: ${usage.dailyCallsUsed}/${usage.dailyCallsLimit} daily, ${usage.minuteCallsUsed}/${usage.minuteCallsLimit}/min`,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Plugin health check
// ---------------------------------------------------------------------------

export async function checkPluginHealth(
  configPlugins?: string[],
): Promise<CheckResult[]> {
  try {
    const { discoverPlugins, PluginManager } = await import("@gpc-cli/core");
    const plugins = await discoverPlugins({ configPlugins });
    if (plugins.length === 0) return [];

    const results: CheckResult[] = [];
    const manager = new PluginManager();

    for (const plugin of plugins) {
      try {
        await manager.load(plugin);
        results.push({
          name: `plugin-${plugin.name}`,
          status: "pass",
          message: `Plugin: ${plugin.name}@${plugin.version ?? "unknown"}`,
        });
      } catch {
        results.push({
          name: `plugin-${plugin.name}`,
          status: "warn",
          message: `Plugin failed to load: ${plugin.name}`,
          suggestion: `Try reinstalling: npm install ${plugin.name}`,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Signing key verification (--verify)
// ---------------------------------------------------------------------------

async function checkSigningKey(
  packageName: string,
  accessToken: string,
  keystorePath?: string,
  storePassword?: string,
  keyAlias?: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const baseUrl = `https://${API_HOST}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;

  let apiFingerprint: string | undefined;
  let latestVersionCode: number | undefined;

  try {
    const editResp = await fetch(`${baseUrl}/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!editResp.ok) {
      results.push({
        name: "signing-api",
        status: "warn",
        message: "Could not create edit to check signing key",
      });
      return results;
    }
    const edit = (await editResp.json()) as { id: string };

    try {
      const bundlesResp = await fetch(`${baseUrl}/edits/${edit.id}/bundles`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!bundlesResp.ok) {
        results.push({
          name: "signing-api",
          status: "warn",
          message: "Could not list bundles",
        });
        return results;
      }
      const bundlesData = (await bundlesResp.json()) as { bundles?: { versionCode: number }[] };
      const bundles = bundlesData.bundles ?? [];

      if (bundles.length === 0) {
        results.push({
          name: "signing-api",
          status: "warn",
          message: "No bundles uploaded yet",
          suggestion:
            "Upload at least one AAB with 'gpc publish' to enable signing key verification",
        });
        return results;
      }

      latestVersionCode = bundles.reduce((max, b) =>
        b.versionCode > max.versionCode ? b : max,
      ).versionCode;

      const apksResp = await fetch(`${baseUrl}/generatedApks/${latestVersionCode}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (apksResp.ok) {
        const apksData = (await apksResp.json()) as {
          generatedApks?: { certificateSha256Fingerprint?: string }[];
        };
        apiFingerprint = apksData.generatedApks?.[0]?.certificateSha256Fingerprint;
      }
    } finally {
      await fetch(`${baseUrl}/edits/${edit.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    }
  } catch (err) {
    results.push({
      name: "signing-api",
      status: "warn",
      message: `Could not verify signing key: ${err instanceof Error ? err.message : String(err)}`,
    });
    return results;
  }

  if (apiFingerprint) {
    results.push({
      name: "signing-api",
      status: "pass",
      message: `Play signing cert (v${latestVersionCode}): ${apiFingerprint}`,
    });
  } else {
    results.push({
      name: "signing-api",
      status: "warn",
      message: `No signing certificate found for versionCode ${latestVersionCode}`,
      suggestion: "Your app may not be enrolled in Play App Signing",
    });
    return results;
  }

  if (!keystorePath) {
    results.push({
      name: "signing-local",
      status: "info",
      message: "No local keystore provided for comparison",
      suggestion:
        "Provide --keystore <path> and --store-pass <password> to compare against Play signing cert",
    });
    return results;
  }

  if (!storePassword) {
    results.push({
      name: "signing-local",
      status: "warn",
      message: "Keystore path provided but no password",
      suggestion: "Provide --store-pass <password> or set GPC_STORE_PASSWORD",
    });
    return results;
  }

  try {
    const { getKeystoreFingerprint, compareFingerprints } = await import("@gpc-cli/core");
    const local = await getKeystoreFingerprint(keystorePath, storePassword, keyAlias);

    if (compareFingerprints(local.sha256, apiFingerprint)) {
      results.push({
        name: "signing-local",
        status: "pass",
        message: `Local keystore (${local.alias}) matches Play signing cert`,
      });
    } else {
      results.push({
        name: "signing-local",
        status: "fail",
        message: `Signing key mismatch: local ${local.sha256} vs Play ${apiFingerprint}`,
        suggestion:
          "Your local keystore does not match the Play signing certificate. If you distribute outside Play with this key, register it in Play Console to avoid installation blocks after September 30, 2026.",
      });
    }
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error.code === "KEYTOOL_NOT_FOUND") {
      results.push({
        name: "signing-local",
        status: "warn",
        message: "keytool not found",
        suggestion: "Install a JDK to enable local keystore verification",
      });
    } else {
      results.push({
        name: "signing-local",
        status: "warn",
        message: `Could not read keystore: ${error.message ?? String(err)}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Auto-fix
// ---------------------------------------------------------------------------

async function applyFix(check: CheckResult): Promise<string | null> {
  switch (check.name) {
    case "config-dir":
    case "cache-dir": {
      const dirMatch = check.message.match(/: (.+)$/);
      if (!dirMatch?.[1]) return null;
      const { mkdir } = await import("node:fs/promises");
      await mkdir(dirMatch[1], {
        recursive: true,
        mode: check.name === "cache-dir" ? 0o700 : 0o755,
      });
      return `Created ${dirMatch[1]}`;
    }
    case "service-account-permissions": {
      const saPath = check.fixData?.["path"];
      if (!saPath) return null;
      const { chmod } = await import("node:fs/promises");
      await chmod(saPath, 0o600);
      return `Fixed permissions on ${saPath}`;
    }
    case "token-cache": {
      const cachePath = check.fixData?.["path"];
      if (!cachePath) return null;
      const { unlink } = await import("node:fs/promises");
      await unlink(cachePath);
      return `Cleared corrupt token cache`;
    }
    case "config": {
      const { initConfig } = await import("@gpc-cli/config");
      await initConfig({});
      return "Initialized config file";
    }
    case "version": {
      // Suggest running gpc update
      return "Run: gpc update";
    }
    case "auth": {
      // Guide user to authenticate
      return "Run: gpc auth login --service-account <path/to/key.json>";
    }
    case "config-keys": {
      const keys = check.fixData?.["keys"];
      if (!keys) return null;
      const { deleteConfigValue } = await import("@gpc-cli/config");
      for (const key of keys.split(",")) {
        await deleteConfigValue(key.trim());
      }
      return `Removed unknown keys: ${keys}`;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Verify setup and connectivity")
    .option("--fix", "Attempt to auto-fix failing checks")
    .option("--verify", "Run signing key verification checks")
    .option("--keystore <path>", "Path to Android keystore (or set GPC_KEYSTORE_PATH)")
    .option("--store-pass <password>", "Keystore password (or set GPC_STORE_PASSWORD)")
    .option("--key-alias <alias>", "Key alias in keystore")
    .action(async (opts, cmd) => {
      const results: CheckResult[] = [];
      const parentOpts = cmd.parent?.opts() ?? {};
      const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");

      // -----------------------------------------------------------------------
      // 1. Node.js version
      // -----------------------------------------------------------------------
      results.push(checkNodeVersion(process.versions.node));

      // -----------------------------------------------------------------------
      // 2. GPC version (non-blocking — catches internally)
      // -----------------------------------------------------------------------
      results.push(await checkGpcVersion());

      // -----------------------------------------------------------------------
      // 3. CI environment (info only)
      // -----------------------------------------------------------------------
      const ciResult = checkCiEnvironment();
      if (ciResult) results.push(ciResult);

      // -----------------------------------------------------------------------
      // 4. Config file + dependent checks
      // -----------------------------------------------------------------------
      let config;
      try {
        config = await loadConfig();
        results.push({ name: "config", status: "pass", message: "Configuration loaded" });

        // 4b. Unknown config keys
        const keysCheck = checkConfigKeys(config as unknown as Record<string, unknown>);
        if (keysCheck) results.push(keysCheck);

        // 4c. Default app
        if (config.app) {
          results.push({
            name: "default-app",
            status: "pass",
            message: `Default app: ${config.app}`,
          });
          const pkgCheck = checkPackageName(config.app);
          if (pkgCheck) results.push(pkgCheck);
        } else {
          results.push({
            name: "default-app",
            status: "info",
            message: "No default app configured",
            suggestion: "Use --app flag or run: gpc config set app <package>",
          });
        }

        // 4d. Developer ID
        const devIdCheck = checkDeveloperId(config.developerId);
        if (devIdCheck) results.push(devIdCheck);
      } catch {
        results.push({
          name: "config",
          status: "fail",
          message: "Configuration could not be loaded",
          suggestion:
            "Run gpc config init to create a config file, or check .gpcrc.json for syntax errors",
        });
      }

      // -----------------------------------------------------------------------
      // 5. Config directory permissions
      // -----------------------------------------------------------------------
      const configDir = getConfigDir();
      try {
        if (existsSync(configDir)) {
          accessSync(configDir, constants.R_OK | constants.W_OK);
          results.push({
            name: "config-dir",
            status: "pass",
            message: `Config directory: ${configDir}`,
          });
        } else {
          results.push({
            name: "config-dir",
            status: "info",
            message: `Config directory does not exist yet: ${configDir}`,
          });
        }
      } catch {
        results.push({
          name: "config-dir",
          status: "warn",
          message: `Config directory not writable: ${configDir}`,
          suggestion: `Fix permissions: chmod 755 ${configDir}`,
        });
      }

      // -----------------------------------------------------------------------
      // 6. Cache directory permissions
      // -----------------------------------------------------------------------
      const cacheDir = getCacheDir();
      try {
        if (existsSync(cacheDir)) {
          accessSync(cacheDir, constants.R_OK | constants.W_OK);
          results.push({
            name: "cache-dir",
            status: "pass",
            message: `Cache directory: ${cacheDir}`,
          });
        } else {
          results.push({
            name: "cache-dir",
            status: "info",
            message: `Cache directory does not exist yet: ${cacheDir}`,
          });
        }
      } catch {
        results.push({
          name: "cache-dir",
          status: "warn",
          message: `Cache directory not writable: ${cacheDir}`,
          suggestion: `Fix permissions: chmod 700 ${cacheDir}`,
        });
      }

      // -----------------------------------------------------------------------
      // 7. Disk space
      // -----------------------------------------------------------------------
      const spaceDir = existsSync(cacheDir) ? cacheDir : configDir;
      if (existsSync(spaceDir)) {
        results.push(await checkDiskSpace(spaceDir));
      }

      // -----------------------------------------------------------------------
      // 8. Service account file + permissions
      // -----------------------------------------------------------------------
      let saFilePath: string | undefined;
      if (config?.auth?.serviceAccount) {
        const saValue = config.auth.serviceAccount;
        const looksLikePath = !saValue.trim().startsWith("{");
        if (looksLikePath) {
          saFilePath = resolve(saValue);
          if (existsSync(saFilePath)) {
            try {
              accessSync(saFilePath, constants.R_OK);
              results.push({
                name: "service-account-file",
                status: "pass",
                message: `Service account file: ${saFilePath}`,
              });
            } catch {
              results.push({
                name: "service-account-file",
                status: "fail",
                message: `Service account file not readable: ${saFilePath}`,
                suggestion: `Fix permissions: chmod 600 ${saFilePath}`,
              });
            }

            // 8b. SA key file permissions (Unix only)
            if (process.platform !== "win32") {
              try {
                const mode = statSync(saFilePath).mode;
                const groupRead = (mode & 0o040) !== 0;
                const worldRead = (mode & 0o004) !== 0;
                if (groupRead || worldRead) {
                  results.push({
                    name: "service-account-permissions",
                    status: "warn",
                    message: `Service account file is group/world-readable (mode: ${(mode & 0o777).toString(8)})`,
                    suggestion: `Restrict permissions: chmod 600 ${saFilePath}`,
                    fixData: { path: saFilePath },
                  });
                } else {
                  results.push({
                    name: "service-account-permissions",
                    status: "pass",
                    message: `Service account file permissions OK (mode: ${(mode & 0o777).toString(8)})`,
                  });
                }
              } catch {
                // stat failed — skip permission check
              }
            }

            // 8c. SA key age
            const ageResult = await checkSaKeyAge(saFilePath);
            if (ageResult) results.push(ageResult);
          } else {
            results.push({
              name: "service-account-file",
              status: "fail",
              message: `Service account file not found: ${saFilePath}`,
              suggestion: "Check the path in your config or GPC_SERVICE_ACCOUNT env var",
            });
          }
        }
      }

      // -----------------------------------------------------------------------
      // 9. Conflicting credentials
      // -----------------------------------------------------------------------
      const conflictCheck = checkConflictingCredentials(saFilePath);
      if (conflictCheck) results.push(conflictCheck);

      // -----------------------------------------------------------------------
      // 10. Token cache health
      // -----------------------------------------------------------------------
      const cacheResult = await checkTokenCache(cacheDir);
      if (cacheResult) results.push(cacheResult);

      // -----------------------------------------------------------------------
      // 11. Profile validation
      // -----------------------------------------------------------------------
      const gpcProfile = process.env["GPC_PROFILE"];
      if (gpcProfile && config) {
        if (config.profiles && gpcProfile in config.profiles) {
          results.push({
            name: "profile",
            status: "pass",
            message: `Profile "${gpcProfile}" found`,
          });
        } else {
          const available = config.profiles ? Object.keys(config.profiles).join(", ") : "";
          results.push({
            name: "profile",
            status: "fail",
            message: `Profile "${gpcProfile}" not found`,
            suggestion: available
              ? `Available profiles: ${available}. Create with: gpc auth login --profile ${gpcProfile}`
              : `No profiles defined. Create one with: gpc auth login --profile ${gpcProfile}`,
          });
        }
      }

      // -----------------------------------------------------------------------
      // 12. Proxy configuration
      // -----------------------------------------------------------------------
      const proxyUrl =
        process.env["HTTPS_PROXY"] ||
        process.env["https_proxy"] ||
        process.env["HTTP_PROXY"] ||
        process.env["http_proxy"];
      const proxyCheck = checkProxy(proxyUrl);
      if (proxyCheck) results.push(proxyCheck);

      // -----------------------------------------------------------------------
      // 13. CA certificate
      // -----------------------------------------------------------------------
      const caCert = process.env["GPC_CA_CERT"] || process.env["NODE_EXTRA_CA_CERTS"];
      if (caCert) {
        if (existsSync(caCert)) {
          results.push({
            name: "ca-cert",
            status: "pass",
            message: `CA certificate: ${caCert}`,
          });
        } else {
          results.push({
            name: "ca-cert",
            status: "warn",
            message: `CA certificate file not found: ${caCert}`,
            suggestion: "Check that GPC_CA_CERT points to an existing PEM file",
          });
        }
      }

      // -----------------------------------------------------------------------
      // 14. DNS resolution — with latency
      // -----------------------------------------------------------------------
      const dnsHosts = [API_HOST, REPORTING_HOST];
      const dnsPassedHosts: string[] = [];

      for (const host of dnsHosts) {
        const label = host.split(".")[0]!;
        try {
          const start = performance.now();
          await lookup(host);
          const ms = Math.round(performance.now() - start);
          results.push({
            name: `dns-${label}`,
            status: "pass",
            message: `DNS: ${host} (${ms}ms)`,
          });
          dnsPassedHosts.push(host);
        } catch {
          results.push({
            name: `dns-${label}`,
            status: "fail",
            message: `Cannot resolve ${host}`,
            suggestion: "Check your DNS settings and network connection",
          });
        }
      }

      // -----------------------------------------------------------------------
      // 15. HTTPS connectivity probe — only for hosts that passed DNS
      // -----------------------------------------------------------------------
      for (const host of dnsPassedHosts) {
        const label = host.split(".")[0]!;
        const probe = await probeHttps(host);
        if (probe.ok) {
          results.push({
            name: `https-${label}`,
            status: "pass",
            message: `HTTPS: ${host} (${probe.latencyMs}ms)`,
          });
        } else {
          results.push({
            name: `https-${label}`,
            status: "fail",
            message: `HTTPS connection failed: ${host}`,
            suggestion: probe.error
              ? `Error: ${probe.error}. Check firewall rules and proxy settings.`
              : "Check firewall rules and proxy settings",
          });
        }
      }

      // -----------------------------------------------------------------------
      // 16. Authentication + API connectivity
      // -----------------------------------------------------------------------
      let accessToken: string | undefined;

      try {
        const authConfig = config ?? (await loadConfig());
        const client = await resolveAuth({
          serviceAccountPath: authConfig.auth?.serviceAccount,
        });
        results.push({
          name: "auth",
          status: "pass",
          message: `Authenticated as ${client.getClientEmail()}`,
        });

        accessToken = await client.getAccessToken();
        results.push({
          name: "api-connectivity",
          status: "pass",
          message: "API connectivity verified",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          results.push({
            name: "auth",
            status: "fail",
            message: `Authentication: ${error.message}`,
            suggestion: error.suggestion,
          });
        } else {
          const detail = error instanceof Error ? error.message : String(error);
          results.push({
            name: "api-connectivity",
            status: "fail",
            message: `API connectivity failed: ${detail}`,
            suggestion: "Check your network connection and credentials",
          });
        }
      }

      // -----------------------------------------------------------------------
      // 17. App access (only if auth succeeded and app is configured)
      // -----------------------------------------------------------------------
      if (accessToken && config?.app) {
        results.push(await checkAppAccess(config.app, accessToken));
      }

      // -----------------------------------------------------------------------
      // 17b. Enterprise / Play Custom App Publishing API probe (best-effort)
      // -----------------------------------------------------------------------
      if (accessToken) {
        results.push(await checkEnterpriseAccess(accessToken));
      }

      // -----------------------------------------------------------------------
      // 18. Developer ID format validation (info only)
      // -----------------------------------------------------------------------
      if (config?.developerId) {
        const devId = String(config.developerId);
        if (/^\d{10,}$/.test(devId)) {
          results.push({
            name: "developer-id",
            status: "pass",
            message: `Developer ID: ${devId}`,
          });
        } else {
          results.push({
            name: "developer-id",
            status: "warn",
            message: `Developer ID "${devId}" may be invalid — expected a long numeric string`,
            suggestion:
              "Find your Developer ID in Play Console → Settings → Developer account → Developer ID.",
          });
        }
      }

      // -----------------------------------------------------------------------
      // 19. Developer verification deadline
      // -----------------------------------------------------------------------
      results.push(checkVerificationDeadline());

      // -----------------------------------------------------------------------
      // 20. Stale status cache
      // -----------------------------------------------------------------------
      const staleCacheResult = await checkStaleCache(cacheDir);
      if (staleCacheResult) results.push(staleCacheResult);

      // -----------------------------------------------------------------------
      // 21. Shell completion
      // -----------------------------------------------------------------------
      const completionResult = await checkShellCompletion();
      if (completionResult) results.push(completionResult);

      // -----------------------------------------------------------------------
      // 22. Quota proximity (reads local audit log, no API needed)
      // -----------------------------------------------------------------------
      const quotaResult = await checkQuotaProximity();
      if (quotaResult) results.push(quotaResult);

      // -----------------------------------------------------------------------
      // 23. Plugin health
      // -----------------------------------------------------------------------
      const pluginResults = await checkPluginHealth(config?.plugins);
      results.push(...pluginResults);

      // -----------------------------------------------------------------------
      // 24. Signing key verification (only when --verify is passed)
      // -----------------------------------------------------------------------
      if (opts["verify"] && accessToken && config?.app) {
        const ksPath = (opts["keystore"] as string | undefined) ?? process.env["GPC_KEYSTORE_PATH"];
        const ksPass =
          (opts["storePass"] as string | undefined) ?? process.env["GPC_STORE_PASSWORD"];
        const ksAlias = opts["keyAlias"] as string | undefined;
        const signingResults = await checkSigningKey(
          config.app,
          accessToken,
          ksPath,
          ksPass,
          ksAlias,
        );
        results.push(...signingResults);
      } else if (opts["verify"] && !accessToken) {
        results.push({
          name: "signing-api",
          status: "warn",
          message: "Cannot verify signing key without authentication",
          suggestion: "Run 'gpc auth login' first, then retry with --verify",
        });
      } else if (opts["verify"] && !config?.app) {
        results.push({
          name: "signing-api",
          status: "warn",
          message: "Cannot verify signing key without a configured app",
          suggestion: "Set a default app with 'gpc config set app <package>' or use --app",
        });
      }

      // -----------------------------------------------------------------------
      // Output
      // -----------------------------------------------------------------------

      // Auto-fix failing checks if --fix was passed
      if (opts["fix"]) {
        for (const r of results) {
          if (r.status === "fail" || r.status === "warn") {
            try {
              const fixMsg = await applyFix(r);
              if (fixMsg) {
                console.log(`  ${green("\u2192")} Fixed: ${fixMsg}`);
                r.status = "pass";
                r.message += " (fixed)";
              }
            } catch (err) {
              console.error(
                `  ${red("\u2717")} Could not fix "${r.name}": ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }
      }

      const errors = results.filter((r) => r.status === "fail").length;
      const warnings = results.filter((r) => r.status === "warn").length;
      const passed = results.filter((r) => r.status === "pass").length;

      if (jsonMode) {
        // Strip fixData from JSON output
        const cleanResults = results.map(({ fixData: _, ...rest }) => rest);
        console.log(
          JSON.stringify(
            { success: errors === 0, errors, warnings, checks: cleanResults },
            null,
            2,
          ),
        );
        process.exitCode = errors > 0 ? 1 : 0;
        return;
      }

      console.log("GPC Doctor\n");
      for (const r of results) {
        console.log(`  ${icon(r.status)} ${r.message}`);
        if (r.suggestion && r.status !== "pass") {
          console.log(`    ${r.suggestion}`);
        }
      }

      console.log(
        `\n  ${green(PASS)} ${passed} passed  ${yellow(WARN)} ${warnings} warning${warnings !== 1 ? "s" : ""}  ${red(FAIL)} ${errors} failed`,
      );

      if (errors > 0) {
        console.log("\nSome checks failed. Fix the issues above and run again.");
        process.exitCode = 1;
      } else if (warnings > 0) {
        console.log("\nAll checks passed with warnings.");
      } else {
        console.log(`\n${green("\u2713")} Ready. Try: gpc status`);
      }
    });
}
