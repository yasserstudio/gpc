#!/usr/bin/env tsx

/**
 * GPC CLI Command Latency Benchmarks
 *
 * Measures config loading time and output formatting performance.
 *
 * Usage:
 *   tsx benchmarks/command-latency.bench.ts          # Print table
 *   tsx benchmarks/command-latency.bench.ts --json   # Output JSON
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASELINE_PATH = join(__dirname, "results-latency-baseline.json");
const RESULTS_PATH = join(__dirname, "results-latency.json");
const ITERATIONS = 10;
const REGRESSION_THRESHOLD = 0.2; // 20%

const jsonFlag = process.argv.includes("--json");

interface BenchResult {
  name: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

interface BaselineData {
  [name: string]: { avgMs: number };
}

function buildLargePayload(): Record<string, unknown>[] {
  return Array.from({ length: 100 }, (_, i) => ({
    id: `com.example.app${i}`,
    title: `Application ${i}`,
    versionCode: 1000 + i,
    status: i % 3 === 0 ? "draft" : i % 3 === 1 ? "inProgress" : "completed",
    lastUpdated: new Date(Date.now() - i * 86400000).toISOString(),
    downloads: Math.floor(Math.random() * 1_000_000),
    rating: Math.round((3 + Math.random() * 2) * 10) / 10,
    category: ["GAME", "PRODUCTIVITY", "SOCIAL", "TOOLS", "EDUCATION"][i % 5],
  }));
}

async function measureAsync(name: string, fn: () => Promise<void> | void): Promise<BenchResult> {
  const timings: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    timings.push(ms);
  }

  const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
  const minMs = Math.min(...timings);
  const maxMs = Math.max(...timings);

  return {
    name,
    avgMs: Math.round(avgMs * 100) / 100,
    minMs: Math.round(minMs * 100) / 100,
    maxMs: Math.round(maxMs * 100) / 100,
  };
}

function printTable(results: BenchResult[], baseline: BaselineData | null): void {
  const header = [
    "Metric",
    "Avg (ms)",
    "Min (ms)",
    "Max (ms)",
    baseline ? "Baseline (ms)" : "",
    baseline ? "Delta" : "",
  ]
    .filter(Boolean)
    .map((h) => h.padEnd(22))
    .join(" | ");

  const separator = header.replace(/[^|]/g, "-");

  console.log("");
  console.log("  GPC CLI — Command Latency Benchmarks");
  console.log(`  Iterations: ${ITERATIONS}`);
  console.log("");
  console.log(`  ${header}`);
  console.log(`  ${separator}`);

  let hasRegression = false;

  for (const r of results) {
    const cols: string[] = [
      r.name.padEnd(22),
      String(r.avgMs).padEnd(22),
      String(r.minMs).padEnd(22),
      String(r.maxMs).padEnd(22),
    ];

    if (baseline && baseline[r.name]) {
      const base = baseline[r.name].avgMs;
      const delta = ((r.avgMs - base) / base) * 100;
      const deltaStr = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
      cols.push(String(base).padEnd(22));

      if (delta > REGRESSION_THRESHOLD * 100) {
        cols.push(`${deltaStr} !! REGRESSION`);
        hasRegression = true;
      } else if (delta < -10) {
        cols.push(`${deltaStr} (faster)`);
      } else {
        cols.push(deltaStr);
      }
    }

    console.log(`  ${cols.join(" | ")}`);
  }

  console.log("");

  if (hasRegression) {
    console.log("  WARNING: Performance regression detected (>20% slower than baseline)");
    console.log("");
  }
}

console.log("Running command latency benchmarks...");

const payload = buildLargePayload();

async function main() {
  const results: BenchResult[] = [];

  // Benchmark: config loading
  try {
    const configResult = await measureAsync("config-load", async () => {
      const { loadConfig } = await import(join(ROOT, "packages", "config", "dist", "index.js"));
      try {
        await loadConfig();
      } catch {
        // Config may not exist in bench environment — that is fine, we measure the attempt
      }
    });
    results.push(configResult);
  } catch {
    console.warn("  Skipping config-load benchmark (package not built?)");
  }

  // Benchmark: output formatting
  try {
    const { formatOutput } = await import(join(ROOT, "packages", "core", "dist", "index.js"));

    const jsonResult = await measureAsync("format-json", () => {
      formatOutput(payload, "json", false);
    });
    results.push(jsonResult);

    const tableResult = await measureAsync("format-table", () => {
      formatOutput(payload, "table", false);
    });
    results.push(tableResult);

    const yamlResult = await measureAsync("format-yaml", () => {
      formatOutput(payload, "yaml", false);
    });
    results.push(yamlResult);
  } catch {
    console.warn("  Skipping format benchmarks (core package not built?)");
  }

  if (results.length === 0) {
    console.error("Error: No benchmarks could run. Ensure packages are built with 'pnpm build'.");
    process.exit(1);
  }

  // Load baseline if it exists
  let baseline: BaselineData | null = null;
  if (existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as BaselineData;
    } catch {
      // Ignore corrupt baseline
    }
  }

  // Save current results
  const resultsMap: BaselineData = {};
  for (const r of results) {
    resultsMap[r.name] = { avgMs: r.avgMs };
  }
  writeFileSync(RESULTS_PATH, JSON.stringify(resultsMap, null, 2) + "\n");

  if (jsonFlag) {
    const output: Record<string, unknown> = {
      iterations: ITERATIONS,
      results: results.map((r) => {
        const entry: Record<string, unknown> = { ...r };
        if (baseline && baseline[r.name]) {
          const base = baseline[r.name].avgMs;
          entry.baselineAvgMs = base;
          entry.deltaPercent = Math.round(((r.avgMs - base) / base) * 1000) / 10;
          entry.regression = entry.deltaPercent > REGRESSION_THRESHOLD * 100;
        }
        return entry;
      }),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printTable(results, baseline);
  }

  // Exit with non-zero if regression detected
  if (baseline) {
    const hasRegression = results.some((r) => {
      if (!baseline![r.name]) return false;
      const delta = (r.avgMs - baseline![r.name].avgMs) / baseline![r.name].avgMs;
      return delta > REGRESSION_THRESHOLD;
    });
    if (hasRegression) {
      process.exit(1);
    }
  }
}

main();
