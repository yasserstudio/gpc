#!/usr/bin/env tsx

/**
 * GPC CLI Startup Performance Benchmarks
 *
 * Measures cold start, help render, and single command load times.
 * Target: cold start under 300ms.
 *
 * Usage:
 *   tsx benchmarks/startup.bench.ts          # Print table
 *   tsx benchmarks/startup.bench.ts --json   # Output JSON
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BIN = join(ROOT, "packages", "cli", "dist", "bin.js");
const BASELINE_PATH = join(__dirname, "results-baseline.json");
const RESULTS_PATH = join(__dirname, "results.json");
const ITERATIONS = 10;
const REGRESSION_THRESHOLD = 0.2; // 20%
const COLD_START_TARGET_MS = 300;

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

function measure(name: string, args: string[]): BenchResult {
  const timings: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    try {
      execFileSync(process.execPath, [BIN, ...args], {
        stdio: "pipe",
        timeout: 10_000,
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
    } catch {
      // Some commands may exit non-zero (e.g., missing config) — we still measure timing
    }
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    timings.push(ms);
  }

  const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
  const minMs = Math.min(...timings);
  const maxMs = Math.max(...timings);

  return { name, avgMs: Math.round(avgMs * 100) / 100, minMs: Math.round(minMs * 100) / 100, maxMs: Math.round(maxMs * 100) / 100 };
}

function printTable(results: BenchResult[], baseline: BaselineData | null): void {
  const header = ["Metric", "Avg (ms)", "Min (ms)", "Max (ms)", baseline ? "Baseline (ms)" : "", baseline ? "Delta" : ""]
    .filter(Boolean)
    .map((h) => h.padEnd(22))
    .join(" | ");

  const separator = header.replace(/[^|]/g, "-");

  console.log("");
  console.log("  GPC CLI — Startup Benchmarks");
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

  // Cold start target check
  const coldStart = results.find((r) => r.name === "cold-start");
  if (coldStart) {
    if (coldStart.avgMs <= COLD_START_TARGET_MS) {
      console.log(`  Cold start target: PASS (${coldStart.avgMs}ms <= ${COLD_START_TARGET_MS}ms)`);
    } else {
      console.log(`  Cold start target: FAIL (${coldStart.avgMs}ms > ${COLD_START_TARGET_MS}ms)`);
    }
  }

  if (hasRegression) {
    console.log("");
    console.log("  WARNING: Performance regression detected (>20% slower than baseline)");
  }

  console.log("");
}

// Verify the built binary exists
if (!existsSync(BIN)) {
  console.error(`Error: CLI binary not found at ${BIN}`);
  console.error("Run 'pnpm build' first.");
  process.exit(1);
}

console.log("Running startup benchmarks...");

const results: BenchResult[] = [
  measure("cold-start", ["--version"]),
  measure("help-render", ["--help"]),
  measure("command-load", ["releases", "--help"]),
];

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
    coldStartTargetMs: COLD_START_TARGET_MS,
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
