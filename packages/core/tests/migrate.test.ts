import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectFastlane,
  parseFastfile,
  parseAppfile,
  generateMigrationPlan,
  writeMigrationOutput,
} from "../src/commands/migrate.js";
import type { FastlaneDetection } from "../src/commands/migrate.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "gpc-migrate-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parseFastfile
// ---------------------------------------------------------------------------
describe("parseFastfile", () => {
  it("parses simple lane with supply action", () => {
    const content = `
lane :deploy do
  supply(track: "internal")
end
`;
    const lanes = parseFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]!.name).toBe("deploy");
    expect(lanes[0]!.actions).toContain("supply");
    expect(lanes[0]!.gpcEquivalent).toBe("gpc releases upload --track internal");
  });

  it("parses lane with upload_to_play_store", () => {
    const content = `
lane :release do
  upload_to_play_store
end
`;
    const lanes = parseFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]!.name).toBe("release");
    expect(lanes[0]!.actions).toContain("upload_to_play_store");
    expect(lanes[0]!.gpcEquivalent).toBe("gpc releases upload");
  });

  it("parses lane with rollout option (decimal → percentage)", () => {
    const content = `
lane :rollout do
  supply(rollout: "0.1")
end
`;
    const lanes = parseFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]!.gpcEquivalent).toBe("gpc releases upload --rollout 10");
  });

  it("parses lane with rollout + track", () => {
    const content = `
lane :staged do
  supply(track: "production", rollout: "0.5")
end
`;
    const lanes = parseFastfile(content);
    expect(lanes[0]!.gpcEquivalent).toBe("gpc releases upload --rollout 50 --track production");
  });

  it("handles already-percentage rollout (>1) gracefully", () => {
    const content = `
lane :rollout do
  supply(rollout: "50")
end
`;
    const lanes = parseFastfile(content);
    expect(lanes[0]!.gpcEquivalent).toBe("gpc releases upload --rollout 50");
  });

  it("parses multiple lanes", () => {
    const content = `
lane :beta do
  upload_to_play_store(track: "beta")
end

lane :screenshots do
  capture_android_screenshots
end
`;
    const lanes = parseFastfile(content);
    expect(lanes).toHaveLength(2);
    expect(lanes[0]!.name).toBe("beta");
    expect(lanes[1]!.name).toBe("screenshots");
    expect(lanes[1]!.gpcEquivalent).toBeUndefined();
  });

  it("returns empty array for empty content", () => {
    expect(parseFastfile("")).toEqual([]);
  });

  it("does not crash on complex Ruby with begin/rescue", () => {
    const content = `
lane :deploy do
  begin
    supply(track: "internal")
  rescue => e
    puts e
  end
end
`;
    // Lane may be partially parsed — just ensure no throw
    expect(() => parseFastfile(content)).not.toThrow();
  });

  it("parses lane with metadata-only supply", () => {
    const content = `
lane :metadata do
  supply(skip_upload_aab: true)
end
`;
    const lanes = parseFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]!.gpcEquivalent).toBe("gpc listings push");
  });
});

// ---------------------------------------------------------------------------
// parseAppfile
// ---------------------------------------------------------------------------
describe("parseAppfile", () => {
  it("extracts package_name", () => {
    const content = `package_name("com.example.myapp")`;
    const result = parseAppfile(content);
    expect(result.packageName).toBe("com.example.myapp");
  });

  it("extracts json_key_file", () => {
    const content = `json_key_file("path/to/key.json")`;
    const result = parseAppfile(content);
    expect(result.jsonKeyPath).toBe("path/to/key.json");
  });

  it("extracts both fields", () => {
    const content = `
package_name("com.example.app")
json_key_file("keys/service-account.json")
`;
    const result = parseAppfile(content);
    expect(result.packageName).toBe("com.example.app");
    expect(result.jsonKeyPath).toBe("keys/service-account.json");
  });

  it("handles missing fields gracefully", () => {
    const result = parseAppfile("# empty appfile");
    expect(result.packageName).toBeUndefined();
    expect(result.jsonKeyPath).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateMigrationPlan
// ---------------------------------------------------------------------------
describe("generateMigrationPlan", () => {
  it("generates config with package name and auth", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: true,
      hasMetadata: false,
      hasGemfile: false,
      packageName: "com.example.app",
      jsonKeyPath: "keys/key.json",
      lanes: [],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.config["app"]).toBe("com.example.app");
    expect(result.config["auth"]).toEqual({ serviceAccount: "keys/key.json" });
  });

  it("adds checklist items for missing config", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: false,
      lanes: [],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.checklist).toContainEqual(expect.stringContaining("Set your package name"));
    expect(result.checklist).toContainEqual(expect.stringContaining("Configure authentication"));
  });

  it("warns about capture_android_screenshots", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: false,
      lanes: [{ name: "screenshots", actions: ["capture_android_screenshots"] }],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("capture_android_screenshots");
  });

  it("includes lane replacement in checklist", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: false,
      lanes: [{ name: "deploy", actions: ["supply"], gpcEquivalent: "gpc releases upload" }],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.checklist).toContainEqual(
      expect.stringContaining('Replace Fastlane lane "deploy"'),
    );
  });

  it("includes Gemfile cleanup when Gemfile exists", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: true,
      lanes: [],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.checklist).toContainEqual(expect.stringContaining("Gemfile"));
  });
});

// ---------------------------------------------------------------------------
// detectFastlane
// ---------------------------------------------------------------------------
describe("detectFastlane", () => {
  it("detects fastlane directory structure", async () => {
    const fastlaneDir = join(tmpDir, "fastlane");
    await mkdir(fastlaneDir, { recursive: true });
    await writeFile(join(fastlaneDir, "Fastfile"), "lane :deploy do\n  supply\nend\n");
    await writeFile(join(fastlaneDir, "Appfile"), 'package_name("com.test.app")\n');

    const result = await detectFastlane(tmpDir);
    expect(result.hasFastfile).toBe(true);
    expect(result.hasAppfile).toBe(true);
    expect(result.packageName).toBe("com.test.app");
    expect(result.lanes).toHaveLength(1);
  });

  it("handles missing files gracefully", async () => {
    const result = await detectFastlane(tmpDir);
    expect(result.hasFastfile).toBe(false);
    expect(result.hasAppfile).toBe(false);
    expect(result.hasMetadata).toBe(false);
    expect(result.hasGemfile).toBe(false);
    expect(result.lanes).toEqual([]);
    expect(result.metadataLanguages).toEqual([]);
  });

  it("detects metadata languages", async () => {
    const metadataDir = join(tmpDir, "fastlane", "metadata", "android");
    await mkdir(join(metadataDir, "en-US"), { recursive: true });
    await mkdir(join(metadataDir, "ja-JP"), { recursive: true });

    const result = await detectFastlane(tmpDir);
    expect(result.hasMetadata).toBe(true);
    expect(result.metadataLanguages).toContain("en-US");
    expect(result.metadataLanguages).toContain("ja-JP");
  });

  it("detects Gemfile", async () => {
    await writeFile(join(tmpDir, "Gemfile"), 'gem "fastlane"\n');

    const result = await detectFastlane(tmpDir);
    expect(result.hasGemfile).toBe(true);
  });

  it("adds parseWarning when Fastfile contains complex Ruby", async () => {
    const fastlaneDir = join(tmpDir, "fastlane");
    await mkdir(fastlaneDir, { recursive: true });
    await writeFile(
      join(fastlaneDir, "Fastfile"),
      "lane :deploy do\n  begin\n    supply\n  rescue\n  end\nend\n",
    );

    const result = await detectFastlane(tmpDir);
    expect(result.parseWarnings.some((w) => w.includes("complex Ruby"))).toBe(true);
  });

  it("always has parseWarnings array (empty when clean)", async () => {
    const fastlaneDir = join(tmpDir, "fastlane");
    await mkdir(fastlaneDir, { recursive: true });
    await writeFile(join(fastlaneDir, "Fastfile"), "lane :deploy do\n  supply\nend\n");

    const result = await detectFastlane(tmpDir);
    expect(Array.isArray(result.parseWarnings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// writeMigrationOutput
// ---------------------------------------------------------------------------
describe("writeMigrationOutput", () => {
  it("writes .gpcrc.json and MIGRATION.md when config is non-empty", async () => {
    const plan = {
      config: { app: "com.test.app" },
      checklist: ["Step 1", "Step 2"],
      warnings: ["Warning 1"],
    };

    const outputDir = join(tmpDir, "output");
    const files = await writeMigrationOutput(plan, outputDir);

    expect(files).toHaveLength(2);
    expect(files[0]).toContain(".gpcrc.json");
    expect(files[1]).toContain("MIGRATION.md");

    const configContent = JSON.parse(await readFile(files[0]!, "utf-8"));
    expect(configContent.app).toBe("com.test.app");

    const mdContent = await readFile(files[1]!, "utf-8");
    expect(mdContent).toContain("Migration Checklist");
    expect(mdContent).toContain("Step 1");
    expect(mdContent).toContain("Warning 1");
  });

  it("creates output directory if it does not exist", async () => {
    const outputDir = join(tmpDir, "deep", "nested", "dir");
    const files = await writeMigrationOutput(
      { config: {}, checklist: [], warnings: [] },
      outputDir,
    );
    // Only MIGRATION.md — empty config skips .gpcrc.json
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("MIGRATION.md");
  });

  it("skips .gpcrc.json when config is empty", async () => {
    const outputDir = join(tmpDir, "empty-config");
    const files = await writeMigrationOutput(
      { config: {}, checklist: ["Step 1"], warnings: [] },
      outputDir,
    );
    expect(files.every((f) => !f.includes(".gpcrc.json"))).toBe(true);
  });

  it("writes .gpcrc.json when config has content", async () => {
    const outputDir = join(tmpDir, "with-config");
    const files = await writeMigrationOutput(
      { config: { app: "com.example.app" }, checklist: [], warnings: [] },
      outputDir,
    );
    expect(files.some((f) => f.includes(".gpcrc.json"))).toBe(true);
  });

  it("includes link to migration guide in MIGRATION.md", async () => {
    const outputDir = join(tmpDir, "with-guide");
    const files = await writeMigrationOutput(
      { config: {}, checklist: [], warnings: [] },
      outputDir,
    );
    const md = await readFile(files[files.length - 1]!, "utf-8");
    expect(md).toContain("yasserstudio.github.io/gpc/migration/from-fastlane");
  });

  it("adds no-equivalent lanes warning with plugin suggestion", () => {
    const detection: FastlaneDetection = {
      hasFastfile: true,
      hasAppfile: false,
      hasMetadata: false,
      hasGemfile: false,
      lanes: [{ name: "custom_notify", actions: [] }],
      metadataLanguages: [],
      parseWarnings: [],
    };

    const result = generateMigrationPlan(detection);
    expect(result.warnings.some((w) => w.includes("custom_notify"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("gpc plugins list"))).toBe(true);
  });
});
