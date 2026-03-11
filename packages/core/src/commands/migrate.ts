import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

export interface FastlaneDetection {
  hasFastfile: boolean;
  hasAppfile: boolean;
  hasMetadata: boolean;
  hasGemfile: boolean;
  packageName?: string;
  jsonKeyPath?: string;
  lanes: FastlaneLane[];
  metadataLanguages: string[];
}

export interface FastlaneLane {
  name: string;
  actions: string[];
  gpcEquivalent?: string;
}

export interface MigrationResult {
  config: Record<string, unknown>;
  checklist: string[];
  warnings: string[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectFastlane(cwd: string): Promise<FastlaneDetection> {
  const result: FastlaneDetection = {
    hasFastfile: false,
    hasAppfile: false,
    hasMetadata: false,
    hasGemfile: false,
    lanes: [],
    metadataLanguages: [],
  };

  // Check for fastlane directory or root-level files
  const fastlaneDir = join(cwd, "fastlane");
  const hasFastlaneDir = await fileExists(fastlaneDir);

  const fastfilePath = hasFastlaneDir
    ? join(fastlaneDir, "Fastfile")
    : join(cwd, "Fastfile");
  const appfilePath = hasFastlaneDir
    ? join(fastlaneDir, "Appfile")
    : join(cwd, "Appfile");

  result.hasFastfile = await fileExists(fastfilePath);
  result.hasAppfile = await fileExists(appfilePath);
  result.hasGemfile = await fileExists(join(cwd, "Gemfile"));

  // Check for metadata directory
  const metadataDir = hasFastlaneDir
    ? join(fastlaneDir, "metadata", "android")
    : join(cwd, "metadata", "android");

  result.hasMetadata = await fileExists(metadataDir);

  if (result.hasMetadata) {
    try {
      const entries = await readdir(metadataDir, { withFileTypes: true });
      result.metadataLanguages = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      // Ignore errors reading metadata dir
    }
  }

  // Parse Fastfile if present
  if (result.hasFastfile) {
    try {
      const content = await readFile(fastfilePath, "utf-8");
      result.lanes = parseFastfile(content);
    } catch {
      // Ignore parse errors
    }
  }

  // Parse Appfile if present
  if (result.hasAppfile) {
    try {
      const content = await readFile(appfilePath, "utf-8");
      const parsed = parseAppfile(content);
      result.packageName = parsed.packageName;
      result.jsonKeyPath = parsed.jsonKeyPath;
    } catch {
      // Ignore parse errors
    }
  }

  return result;
}

export function parseFastfile(content: string): FastlaneLane[] {
  const lanes: FastlaneLane[] = [];
  // Match lane blocks: lane :name do ... end
  const laneRegex = /lane\s+:(\w+)\s+do([\s\S]*?)(?=\bend\b)/g;
  let match: RegExpExecArray | null;

  while ((match = laneRegex.exec(content)) !== null) {
    const name = match[1] ?? "";
    const body = match[2] ?? "";
    const actions: string[] = [];

    // Extract action calls (Ruby method calls at the start of a line or after whitespace)
    const actionRegex = /\b(supply|upload_to_play_store|capture_android_screenshots|deliver|gradle)\b/g;
    let actionMatch: RegExpExecArray | null;
    while ((actionMatch = actionRegex.exec(body)) !== null) {
      const action = actionMatch[1] ?? "";
      if (!actions.includes(action)) {
        actions.push(action);
      }
    }

    // Determine GPC equivalent
    const gpcEquivalent = mapLaneToGpc(name, actions, body);

    lanes.push({ name, actions, gpcEquivalent });
  }

  return lanes;
}

function mapLaneToGpc(name: string, actions: string[], body: string): string | undefined {
  if (actions.includes("upload_to_play_store") || actions.includes("supply")) {
    // Check for specific options
    const trackMatch = body.match(/track\s*:\s*["'](\w+)["']/);
    const rolloutMatch = body.match(/rollout\s*:\s*["']?([\d.]+)["']?/);

    if (rolloutMatch) {
      const percentage = Math.round(parseFloat(rolloutMatch[1] ?? "0") * 100);
      return `gpc releases promote --rollout ${percentage}`;
    }

    if (trackMatch) {
      return `gpc releases upload --track ${trackMatch[1]}`;
    }

    // Check if it's mainly a metadata push
    if (body.match(/skip_upload_apk\s*:\s*true/) || body.match(/skip_upload_aab\s*:\s*true/)) {
      return "gpc listings push";
    }

    return "gpc releases upload";
  }

  if (actions.includes("capture_android_screenshots")) {
    return undefined; // No equivalent
  }

  return undefined;
}

export function parseAppfile(content: string): { packageName?: string; jsonKeyPath?: string } {
  const result: { packageName?: string; jsonKeyPath?: string } = {};

  // Match package_name("com.example.app") or package_name "com.example.app"
  const pkgMatch = content.match(/package_name\s*\(?\s*["']([^"']+)["']\s*\)?/);
  if (pkgMatch) {
    result.packageName = pkgMatch[1];
  }

  // Match json_key_file("path/to/key.json") or json_key_file "path/to/key.json"
  const keyMatch = content.match(/json_key_file\s*\(?\s*["']([^"']+)["']\s*\)?/);
  if (keyMatch) {
    result.jsonKeyPath = keyMatch[1];
  }

  return result;
}

export function generateMigrationPlan(detection: FastlaneDetection): MigrationResult {
  const config: Record<string, unknown> = {};
  const checklist: string[] = [];
  const warnings: string[] = [];

  // Set package name if detected
  if (detection.packageName) {
    config["app"] = detection.packageName;
  } else {
    checklist.push("Set your package name: gpc config set app <package-name>");
  }

  // Set auth config if key path detected
  if (detection.jsonKeyPath) {
    config["auth"] = { serviceAccount: detection.jsonKeyPath };
  } else {
    checklist.push("Configure authentication: gpc auth setup");
  }

  // Lane mappings
  for (const lane of detection.lanes) {
    if (lane.gpcEquivalent) {
      checklist.push(`Replace Fastlane lane "${lane.name}" with: ${lane.gpcEquivalent}`);
    }

    if (lane.actions.includes("capture_android_screenshots")) {
      warnings.push(
        `Lane "${lane.name}" uses capture_android_screenshots which has no GPC equivalent. You will need to continue using Fastlane for screenshot capture or use a separate tool.`,
      );
    }
  }

  // Metadata migration
  if (detection.hasMetadata && detection.metadataLanguages.length > 0) {
    checklist.push(
      `Migrate metadata for ${detection.metadataLanguages.length} language(s): gpc listings pull --dir metadata`,
    );
    checklist.push("Review and push metadata: gpc listings push --dir metadata");
  }

  // General checklist items
  checklist.push("Run gpc doctor to verify your setup");
  checklist.push("Test with --dry-run before making real changes");

  if (detection.hasGemfile) {
    checklist.push("Remove Fastlane from your Gemfile once migration is complete");
  }

  // CI warnings
  if (detection.lanes.some((l) => l.actions.includes("supply") || l.actions.includes("upload_to_play_store"))) {
    checklist.push("Update CI/CD pipelines to use gpc commands instead of Fastlane lanes");
  }

  return { config, checklist, warnings };
}

export async function writeMigrationOutput(
  result: MigrationResult,
  dir: string,
): Promise<string[]> {
  await mkdir(dir, { recursive: true });
  const files: string[] = [];

  // Write .gpcrc.json
  const configPath = join(dir, ".gpcrc.json");
  await writeFile(configPath, JSON.stringify(result.config, null, 2) + "\n", "utf-8");
  files.push(configPath);

  // Write MIGRATION.md
  const migrationPath = join(dir, "MIGRATION.md");
  const lines: string[] = [
    "# Fastlane to GPC Migration",
    "",
    "## Migration Checklist",
    "",
  ];

  for (const item of result.checklist) {
    lines.push(`- [ ] ${item}`);
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("## Warnings");
    lines.push("");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push("");
  lines.push("## Quick Reference");
  lines.push("");
  lines.push("| Fastlane | GPC |");
  lines.push("|----------|-----|");
  lines.push("| `fastlane supply` | `gpc releases upload` / `gpc listings push` |");
  lines.push("| `upload_to_play_store` | `gpc releases upload` |");
  lines.push("| `supply(track: \"internal\")` | `gpc releases upload --track internal` |");
  lines.push("| `supply(rollout: \"0.1\")` | `gpc releases promote --rollout 10` |");
  lines.push("| `capture_android_screenshots` | No equivalent (use separate tool) |");
  lines.push("");

  await writeFile(migrationPath, lines.join("\n"), "utf-8");
  files.push(migrationPath);

  return files;
}
