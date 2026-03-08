import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { DEFAULT_CONFIG } from "./defaults.js";
import { getUserConfigPath } from "./paths.js";
import type { GpcConfig, OutputFormat, ResolvedConfig } from "./types.js";

const VALID_OUTPUT_FORMATS: ReadonlySet<string> = new Set([
  "table",
  "json",
  "yaml",
  "markdown",
]);

function isValidOutputFormat(value: string): value is OutputFormat {
  return VALID_OUTPUT_FORMATS.has(value);
}

export function loadEnvConfig(): Partial<GpcConfig> {
  const config: Partial<GpcConfig> = {};

  const app = process.env["GPC_APP"];
  if (app) config.app = app;

  const output = process.env["GPC_OUTPUT"];
  if (output) {
    if (isValidOutputFormat(output)) {
      config.output = output;
    }
  }

  const profile = process.env["GPC_PROFILE"];
  if (profile) config.profile = profile;

  const serviceAccount = process.env["GPC_SERVICE_ACCOUNT"];
  if (serviceAccount) {
    config.auth = { serviceAccount };
  }

  const developerId = process.env["GPC_DEVELOPER_ID"];
  if (developerId) config.developerId = developerId;

  return config;
}

export function findConfigFile(startDir?: string): string | undefined {
  let dir = startDir || process.cwd();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const candidate = join(dir, ".gpcrc.json");
    try {
      statSync(candidate);
      return candidate;
    } catch {
      // file does not exist, keep walking up
    }

    const parent = dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }

  return undefined;
}

export async function readConfigFile(filePath: string): Promise<GpcConfig> {
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as GpcConfig;

  // Validate output format if present
  if (parsed.output !== undefined && !isValidOutputFormat(parsed.output)) {
    throw new Error(
      `Invalid output format "${String(parsed.output)}" in ${filePath}. Must be one of: ${[...VALID_OUTPUT_FORMATS].join(", ")}`,
    );
  }

  return parsed;
}

export async function loadConfig(
  overrides?: Partial<GpcConfig>,
): Promise<ResolvedConfig> {
  // Layer 5: defaults
  const result: ResolvedConfig = { ...DEFAULT_CONFIG };

  // Layer 4: user config file (~/.config/gpc/config.json)
  try {
    const userConfig = await readConfigFile(getUserConfigPath());
    Object.assign(result, stripUndefined(userConfig));
  } catch {
    // User config doesn't exist or is invalid — skip
  }

  // Layer 3: project config file (.gpcrc.json walking up)
  const projectConfigPath = findConfigFile();
  if (projectConfigPath) {
    try {
      const projectConfig = await readConfigFile(projectConfigPath);
      Object.assign(result, stripUndefined(projectConfig));
      result.configPath = projectConfigPath;
    } catch {
      // Project config is invalid — skip
    }
  }

  // Layer 2: environment variables
  const envConfig = loadEnvConfig();
  Object.assign(result, stripUndefined(envConfig));

  // Layer 1: CLI flag overrides
  if (overrides) {
    Object.assign(result, stripUndefined(overrides));
  }

  // Validate final output format
  if (!isValidOutputFormat(result.output)) {
    result.output = DEFAULT_CONFIG.output;
  }

  return result;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }
  return cleaned;
}
