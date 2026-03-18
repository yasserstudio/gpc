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
  parseWarnings: string[];
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

// Ruby constructs that confuse the lane-end regex
const COMPLEX_RUBY_RE = /\b(begin|rescue|ensure|if |unless |case |while |until |for )\b/;

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
    parseWarnings: [],
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
      result.parseWarnings.push("Could not read metadata directory — check permissions");
    }
  }

  // Parse Fastfile if present
  if (result.hasFastfile) {
    try {
      const content = await readFile(fastfilePath, "utf-8");
      result.lanes = parseFastfile(content);

      // Warn if the Fastfile contains complex Ruby that may have been misread
      if (COMPLEX_RUBY_RE.test(content)) {
        result.parseWarnings.push(
          "Fastfile contains complex Ruby constructs (begin/rescue/if/unless/case). " +
            "Lane detection may be incomplete — review MIGRATION.md and adjust manually.",
        );
      }
    } catch {
      result.parseWarnings.push("Could not read Fastfile — check permissions");
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
      result.parseWarnings.push("Could not read Appfile — check permissions");
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

    // Extract action calls
    const actionRegex =
      /\b(supply|upload_to_play_store|capture_android_screenshots|deliver|gradle)\b/g;
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
    const trackMatch = body.match(/track\s*:\s*["'](\w+)["']/);
    const rolloutMatch = body.match(/rollout\s*:\s*["']?([\d.]+)["']?/);

    if (rolloutMatch) {
      const raw = parseFloat(rolloutMatch[1] ?? "0");
      // Fastlane uses 0.0–1.0; convert to whole percentage for gpc
      const pct = raw > 1 ? Math.round(raw) : Math.round(raw * 100);
      return `gpc releases upload --rollout ${pct}${trackMatch ? ` --track ${trackMatch[1]}` : ""}`;
    }

    if (trackMatch) {
      return `gpc releases upload --track ${trackMatch[1]}`;
    }

    // Metadata-only supply
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
  const warnings: string[] = [...detection.parseWarnings];

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
    checklist.push("Configure authentication: gpc auth login");
  }

  // Lane mappings
  for (const lane of detection.lanes) {
    if (lane.gpcEquivalent) {
      checklist.push(
        `Replace Fastlane lane "${lane.name}" with: ${lane.gpcEquivalent} <your.aab>`,
      );
    }

    if (lane.actions.includes("capture_android_screenshots")) {
      warnings.push(
        `Lane "${lane.name}" uses capture_android_screenshots which has no GPC equivalent. ` +
          "Use a separate screenshot tool or check gpc plugins list for community plugins.",
      );
    }

    // Lanes with no known action and no GPC equivalent
    if (
      lane.actions.length === 0 ||
      (lane.gpcEquivalent === undefined && !lane.actions.includes("capture_android_screenshots"))
    ) {
      warnings.push(
        `Lane "${lane.name}" has no automatic GPC equivalent. ` +
          "Check `gpc plugins list` or the plugin SDK docs to build a custom command.",
      );
    }
  }

  // Metadata migration
  if (detection.hasMetadata && detection.metadataLanguages.length > 0) {
    const langs = detection.metadataLanguages.slice(0, 3).join(", ");
    const more =
      detection.metadataLanguages.length > 3
        ? ` (+${detection.metadataLanguages.length - 3} more)`
        : "";
    checklist.push(
      `Pull current metadata for ${detection.metadataLanguages.length} language(s) (${langs}${more}): gpc listings pull --dir fastlane/metadata/android`,
    );
    checklist.push(
      "Review pulled metadata, then push back: gpc listings push --dir fastlane/metadata/android",
    );
  }

  // General checklist items
  checklist.push("Run gpc doctor to verify your setup");
  checklist.push("Test each command with --dry-run before making real changes");

  if (detection.hasGemfile) {
    checklist.push("Remove Fastlane from your Gemfile once migration is complete");
  }

  // CI/CD reminder
  if (
    detection.lanes.some(
      (l) => l.actions.includes("supply") || l.actions.includes("upload_to_play_store"),
    )
  ) {
    checklist.push("Update CI/CD pipelines to call gpc commands instead of Fastlane lanes");
  }

  return { config, checklist, warnings };
}

export async function writeMigrationOutput(
  result: MigrationResult,
  dir: string,
): Promise<string[]> {
  await mkdir(dir, { recursive: true });
  const files: string[] = [];

  // Write .gpcrc.json only if we have something meaningful to put in it
  if (Object.keys(result.config).length > 0) {
    const configPath = join(dir, ".gpcrc.json");
    await writeFile(configPath, JSON.stringify(result.config, null, 2) + "\n", "utf-8");
    files.push(configPath);
  }

  // Write MIGRATION.md
  const migrationPath = join(dir, "MIGRATION.md");
  const lines: string[] = [
    "# Fastlane to GPC Migration",
    "",
    "Generated by `gpc migrate fastlane`. Review and adjust before applying.",
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
      lines.push(`> ⚠ ${warning}`);
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
  lines.push("| `supply(rollout: \"0.1\")` | `gpc releases upload --rollout 10` |");
  lines.push("| `supply(skip_upload_aab: true)` | `gpc listings push` |");
  lines.push("| `capture_android_screenshots` | No equivalent — use separate tool |");
  lines.push("");
  lines.push("See the full migration guide: https://yasserstudio.github.io/gpc/migration/from-fastlane");
  lines.push("");

  await writeFile(migrationPath, lines.join("\n"), "utf-8");
  files.push(migrationPath);

  return files;
}
