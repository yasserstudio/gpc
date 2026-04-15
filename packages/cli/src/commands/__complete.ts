import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";
import { getCacheDir, getUserConfigPath, listProfiles } from "@gpc-cli/config";

// Keep this file dependency-light on purpose.
// It is called on every TAB press; loading @gpc-cli/api or @gpc-cli/auth would
// blow the <100ms cold-start budget. Only pull from @gpc-cli/config + node:fs.

const STATIC_TRACKS = ["production", "beta", "alpha", "internal"] as const;

/** Emit one value per line; silent on any error. */
function emit(values: readonly string[]): void {
  for (const v of values) {
    if (v) console.log(v);
  }
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
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
