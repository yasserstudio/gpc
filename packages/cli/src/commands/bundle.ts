import type { Command } from "commander";
import {
  analyzeBundle,
  compareBundles,
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
    .action(async (file: string, opts: { threshold?: number }) => {
      const format = getOutputFormat(program, await getConfig());

      try {
        const analysis = await analyzeBundle(file);

        if (format === "json") {
          console.log(formatOutput(analysis, format));
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

        // Threshold check
        if (opts.threshold !== undefined) {
          const thresholdBytes = opts.threshold * 1024 * 1024;
          if (analysis.totalCompressed > thresholdBytes) {
            console.error(
              `\nThreshold breached: ${formatSize(analysis.totalCompressed)} > ${opts.threshold} MB`,
            );
            process.exit(6);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  bundle
    .command("compare <file1> <file2>")
    .description("Compare size differences between two bundles or APKs")
    .action(async (file1: string, file2: string) => {
      const format = getOutputFormat(program, await getConfig());

      try {
        const [before, after] = await Promise.all([
          analyzeBundle(file1),
          analyzeBundle(file2),
        ]);
        const comparison = compareBundles(before, after);

        if (format === "json") {
          console.log(formatOutput(comparison, format));
        } else {
          const sign = comparison.sizeDelta >= 0 ? "+" : "";
          console.log(`\nBefore: ${comparison.before.path} (${formatSize(comparison.before.totalCompressed)})`);
          console.log(`After:  ${comparison.after.path} (${formatSize(comparison.after.totalCompressed)})`);
          console.log(`Delta:  ${sign}${formatSize(comparison.sizeDelta)} (${sign}${comparison.sizeDeltaPercent}%)\n`);

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
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

async function getConfig() {
  const { loadConfig } = await import("@gpc-cli/config");
  return loadConfig();
}
