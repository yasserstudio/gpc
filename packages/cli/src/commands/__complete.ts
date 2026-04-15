import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";
import { getCacheDir, getUserConfigPath, listProfiles } from "@gpc-cli/config";

// Keep this file dependency-light on purpose.
// It is called on every TAB press; loading @gpc-cli/api or @gpc-cli/auth would
// blow the <100ms cold-start budget. Only pull from @gpc-cli/config + node:fs.

const STATIC_TRACKS = ["production", "beta", "alpha", "internal"] as const;

const DEBUG = process.env["GPC_DEBUG"] === "1";

function debug(msg: string): void {
  if (DEBUG) process.stderr.write(`[gpc __complete] ${msg}\n`);
}

/** Emit one value per line; silent on any error. */
function emit(values: readonly string[]): void {
  for (const v of values) {
    if (v) console.log(v);
  }
}

// Prototype-pollution defense: strip __proto__/constructor/prototype from
// parsed JSON. Mirrors packages/config/src/loader.ts:92 so cache and config
// files are treated consistently.
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function sanitize(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) sanitize(item);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (DANGEROUS_KEYS.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete record[key];
    } else if (typeof record[key] === "object" && record[key] !== null) {
      sanitize(record[key]);
    }
  }
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as T;
    sanitize(parsed);
    return parsed;
  } catch (err) {
    // Silent fallback is by design (empty/stale cache is indistinguishable
    // from corrupt from the user's POV), but under GPC_DEBUG=1 surface the
    // error so authors can diagnose bad config or cache files.
    debug(`readJson(${path}) failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

interface ProfileEntry {
  app?: string;
}
interface RawConfig {
  app?: string;
  profiles?: Record<string, ProfileEntry>;
}

async function readProjectConfig(): Promise<RawConfig | null> {
  return readJson<RawConfig>(join(process.cwd(), ".gpcrc.json"));
}

async function readUserConfig(): Promise<RawConfig | null> {
  return readJson<RawConfig>(getUserConfigPath());
}

async function cachedPackageNames(): Promise<string[]> {
  try {
    const entries = await readdir(getCacheDir());
    return entries
      .filter((f) => f.startsWith("status-") && f.endsWith(".json"))
      .map((f) => f.slice("status-".length, -".json".length));
  } catch {
    return [];
  }
}

interface StatusCacheEntry {
  fetchedAt?: string;
  ttl?: number;
  data?: {
    releases?: Array<{ track?: string; versionCode?: string }>;
  };
}

async function readFreshStatusCache(packageName: string): Promise<StatusCacheEntry | null> {
  const entry = await readJson<StatusCacheEntry>(
    join(getCacheDir(), `status-${packageName}.json`),
  );
  if (!entry?.fetchedAt) return null;
  const ttl = entry.ttl ?? 3600;
  const ageSec = (Date.now() - new Date(entry.fetchedAt).getTime()) / 1000;
  if (ageSec > ttl) return null;
  return entry;
}

export async function runContext(context: string, args: readonly string[] = []): Promise<string[]> {
  switch (context) {
    case "profiles":
      return completeProfiles();
    case "packages":
      return completePackages();
    case "tracks-for-app":
      return completeTracksForApp(args[0]);
    case "releases-for-track":
      return completeReleasesForTrack(args[0], args[1]);
    default:
      return [];
  }
}

export async function completeProfiles(): Promise<string[]> {
  return listProfiles();
}

export async function completePackages(): Promise<string[]> {
  const seen = new Set<string>();
  const [proj, user, cached] = await Promise.all([
    readProjectConfig(),
    readUserConfig(),
    cachedPackageNames(),
  ]);
  for (const cfg of [proj, user]) {
    if (cfg?.app) seen.add(cfg.app);
    if (cfg?.profiles) {
      for (const p of Object.values(cfg.profiles)) {
        if (p?.app) seen.add(p.app);
      }
    }
  }
  for (const pkg of cached) seen.add(pkg);
  return [...seen].sort();
}

export async function completeTracksForApp(packageName: string | undefined): Promise<string[]> {
  const tracks = new Set<string>(STATIC_TRACKS);
  if (packageName) {
    const entry = await readFreshStatusCache(packageName);
    for (const r of entry?.data?.releases ?? []) {
      if (r.track) tracks.add(r.track);
    }
  } else {
    // No package arg: shell scripts don't currently parse the already-typed
    // --app value. As a best-effort, aggregate custom track names from every
    // fresh status cache so `gpc --track <TAB>` still surfaces non-standard
    // tracks the user has published to recently.
    const packages = await cachedPackageNames();
    const entries = await Promise.all(packages.map((p) => readFreshStatusCache(p)));
    for (const entry of entries) {
      for (const r of entry?.data?.releases ?? []) {
        if (r.track) tracks.add(r.track);
      }
    }
  }
  return [...tracks];
}

export async function completeReleasesForTrack(
  packageName: string | undefined,
  track: string | undefined,
): Promise<string[]> {
  if (!packageName || !track) return [];
  const entry = await readFreshStatusCache(packageName);
  return (entry?.data?.releases ?? [])
    .filter((r) => r.track === track && r.versionCode)
    .map((r) => r.versionCode as string);
}

/** Register the hidden `__complete` subcommand on the program. */
export function registerCompleteCommand(program: Command): void {
  const complete = new Command("__complete")
    .description("Internal: shell completion value provider (hidden)")
    .argument("<context>", "profiles | packages | tracks-for-app | releases-for-track")
    .argument("[args...]", "Context-specific positional args")
    .allowUnknownOption(true)
    .action(async (context: string, args: string[]) => {
      try {
        const values = await runContext(context, args);
        emit(values);
      } catch {
        // Never throw from a completion handler.
      }
    });

  program.addCommand(complete, { hidden: true });
}
