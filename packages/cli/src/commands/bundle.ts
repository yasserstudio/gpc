import type { Command } from "commander";
import {
  analyzeBundle,
  compareBundles,
  topFiles,
  checkBundleSize,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

function formatSize(bytes: number): string {
  const abs = Math.abs(bytes);
  const sign = bytes < 0 ? "-" : "";
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)} KB`;
  return `${sign}${(abs / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDelta(delta: number): string {
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${formatSize(delta)}`;
}

export function registerBundleCommands(program: Command): void {
  const bundle = program.command("bundle").description("Analyze app bundles and APKs");

  bundle
    .command("analyze <file>")
    .description("Analyze size breakdown of an AAB or APK")
    .option("--threshold <mb>", "Fail if compressed size exceeds threshold (MB)", parseFloat)
    .option("--top <n>", "Show top N largest files", (v) => parseInt(v, 10))
    .option("--config <file>", "Check against .bundlesize.json thresholds")
    .action(async (file: string, opts: { threshold?: number; top?: number; config?: string }) => {
      const format = getOutputFormat(program, await getConfig());

      const analysis = await analyzeBundle(file);

      if (format === "json") {
          console.log(formatOutput(analysis, format));
        } else if (format === "markdown") {
          const moduleRows = analysis.modules.map((m) => ({
            module: m.name,
            compressed: formatSize(m.compressedSize),
            uncompressed: formatSize(m.uncompressedSize),
            entries: m.entries,
          }));
          const categoryRows = analysis.categories.map((c) => ({
            category: c.name,
            compressed: formatSize(c.compressedSize),
            uncompressed: formatSize(c.uncompressedSize),
            entries: c.entries,
          }));
          console.log(`## Bundle Analysis: \`${analysis.filePath}\``);
          console.log();
          console.log(`| Property | Value |`);
          console.log(`| --- | --- |`);
          console.log(`| Type | ${analysis.fileType.toUpperCase()} |`);
          console.log(`| Total compressed | ${formatSize(analysis.totalCompressed)} |`);
          console.log(`| Total uncompressed | ${formatSize(analysis.totalUncompressed)} |`);
          console.log(`| Entries | ${analysis.entryCount} |`);
          console.log();
          console.log(`### Modules`);
          console.log();
          console.log(formatOutput(moduleRows, "markdown"));
          console.log();
          console.log(`### Categories`);
          console.log();
          console.log(formatOutput(categoryRows, "markdown"));
        } else {
          console.log(`\nFile: ${analysis.filePath}`);
          console.log(`Type: ${analysis.fileType.toUpperCase()}`);
          console.log(`Total compressed: ${formatSize(analysis.totalCompressed)}`);
          console.log(`Total uncompressed: ${formatSize(analysis.totalUncompressed)}`);
          console.log(`Entries: ${analysis.entryCount}\n`);

          // Modules table
          const moduleRows = analysis.modules.map((m) => ({
            module: m.name,
            compressed: formatSize(m.compressedSize),
            uncompressed: formatSize(m.uncompressedSize),
            entries: m.entries,
          }));
          console.log("Modules:");
          console.log(formatOutput(moduleRows, "table"));

          // Categories table
          const categoryRows = analysis.categories.map((c) => ({
            category: c.name,
            compressed: formatSize(c.compressedSize),
            uncompressed: formatSize(c.uncompressedSize),
            entries: c.entries,
          }));
          console.log("\nCategories:");
          console.log(formatOutput(categoryRows, "table"));
        }

        // Top N files
        if (opts.top !== undefined) {
          const largest = topFiles(analysis, opts.top);
          const topRows = largest.map((e) => ({
            path: e.path,
            compressed: formatSize(e.compressedSize),
            uncompressed: formatSize(e.uncompressedSize),
            category: e.category,
          }));
          console.log(`\nTop ${opts.top} files:`);
          console.log(formatOutput(topRows, format === "json" ? "table" : format));
        }

      // .bundlesize.json config check
      if (opts.config) {
        const check = await checkBundleSize(analysis, opts.config);
        if (!check.passed) {
          const violations = check.violations.map((v) => `${v.subject}: ${formatSize(v.actual)} > max ${formatSize(v.max)}`).join("; ");
          const err = new Error(`Bundle size check failed: ${violations}`);
          Object.assign(err, { code: "THRESHOLD_BREACH", exitCode: 6 });
          throw err;
        }
      }

      // Legacy --threshold check
      if (opts.threshold !== undefined) {
        const thresholdBytes = opts.threshold * 1024 * 1024;
        if (analysis.totalCompressed > thresholdBytes) {
          const err = new Error(`Threshold breached: ${formatSize(analysis.totalCompressed)} > ${opts.threshold} MB`);
          Object.assign(err, { code: "THRESHOLD_BREACH", exitCode: 6 });
          throw err;
        }
      }
    });

  bundle
    .command("compare <file1> <file2>")
    .description("Compare size differences between two bundles or APKs")
    .action(async (file1: string, file2: string) => {
      const format = getOutputFormat(program, await getConfig());

      const [before, after] = await Promise.all([analyzeBundle(file1), analyzeBundle(file2)]);
      const comparison = compareBundles(before, after);

      if (format === "json") {
          console.log(formatOutput(comparison, format));
        } else if (format === "markdown") {
          const sign = comparison.sizeDelta >= 0 ? "+" : "";
          const moduleRows = comparison.moduleDeltas
            .filter((m) => m.delta !== 0)
            .map((m) => ({
              module: m.module,
              before: formatSize(m.before),
              after: formatSize(m.after),
              delta: formatDelta(m.delta),
            }));
          const categoryRows = comparison.categoryDeltas
            .filter((c) => c.delta !== 0)
            .map((c) => ({
              category: c.category,
              before: formatSize(c.before),
              after: formatSize(c.after),
              delta: formatDelta(c.delta),
            }));
          console.log(`## Bundle Comparison`);
          console.log();
          console.log(`| | Path | Size |`);
          console.log(`| --- | --- | --- |`);
          console.log(
            `| Before | \`${comparison.before.path}\` | ${formatSize(comparison.before.totalCompressed)} |`,
          );
          console.log(
            `| After | \`${comparison.after.path}\` | ${formatSize(comparison.after.totalCompressed)} |`,
          );
          console.log(
            `| **Delta** | | **${sign}${formatSize(comparison.sizeDelta)} (${sign}${comparison.sizeDeltaPercent}%)** |`,
          );
          if (moduleRows.length > 0) {
            console.log();
            console.log(`### Module Changes`);
            console.log();
            console.log(formatOutput(moduleRows, "markdown"));
          }
          if (categoryRows.length > 0) {
            console.log();
            console.log(`### Category Changes`);
            console.log();
            console.log(formatOutput(categoryRows, "markdown"));
          }
        } else {
          const sign = comparison.sizeDelta >= 0 ? "+" : "";
          console.log(
            `\nBefore: ${comparison.before.path} (${formatSize(comparison.before.totalCompressed)})`,
          );
          console.log(
            `After:  ${comparison.after.path} (${formatSize(comparison.after.totalCompressed)})`,
          );
          console.log(
            `Delta:  ${sign}${formatSize(comparison.sizeDelta)} (${sign}${comparison.sizeDeltaPercent}%)\n`,
          );

          // Module deltas
          const moduleRows = comparison.moduleDeltas
            .filter((m) => m.delta !== 0)
            .map((m) => ({
              module: m.module,
              before: formatSize(m.before),
              after: formatSize(m.after),
              delta: formatDelta(m.delta),
            }));
          if (moduleRows.length > 0) {
            console.log("Module changes:");
            console.log(formatOutput(moduleRows, "table"));
          }

          // Category deltas
          const categoryRows = comparison.categoryDeltas
            .filter((c) => c.delta !== 0)
            .map((c) => ({
              category: c.category,
              before: formatSize(c.before),
              after: formatSize(c.after),
              delta: formatDelta(c.delta),
            }));
          if (categoryRows.length > 0) {
            console.log("\nCategory changes:");
            console.log(formatOutput(categoryRows, "table"));
          }
        }
    });
}

async function getConfig() {
  const { loadConfig } = await import("@gpc-cli/config");
  return loadConfig();
}
