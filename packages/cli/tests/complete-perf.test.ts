import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Cold-start perf guard for `gpc __complete`.
 *
 * Shell completion fires on every TAB press. The node-channel budget matches
 * the CLI's overall cold-start target (300ms, see ROADMAP "Road to 1.0");
 * standalone-binary users see ~80ms.
 *
 * Runs only when the built bin is present. Turborepo wires `test.dependsOn:
 * ["build"]`, so CI always exercises this; local watch mode skips gracefully.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "dist", "bin.js");
const BUDGET_MS = 300;
const ITERATIONS = 3;

function timeSpawn(args: string[]): number {
  const timings: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    try {
      execFileSync(process.execPath, [BIN, ...args], {
        stdio: "pipe",
        timeout: 5000,
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
    } catch {
      // Completion handlers must never throw; tolerate non-zero exit here too.
    }
    const end = process.hrtime.bigint();
    timings.push(Number(end - start) / 1_000_000);
  }
  // Median of 3
  timings.sort((a, b) => a - b);
  return timings[1] as number;
}

describe.skipIf(!existsSync(BIN))("__complete cold-start perf", () => {
  it(`profiles completes under ${BUDGET_MS}ms (median of ${ITERATIONS})`, () => {
    const median = timeSpawn(["__complete", "profiles"]);
    expect(median).toBeLessThan(BUDGET_MS);
  });

  it(`packages completes under ${BUDGET_MS}ms`, () => {
    const median = timeSpawn(["__complete", "packages"]);
    expect(median).toBeLessThan(BUDGET_MS);
  });

  it(`tracks-for-app completes under ${BUDGET_MS}ms`, () => {
    const median = timeSpawn(["__complete", "tracks-for-app", "com.example.app"]);
    expect(median).toBeLessThan(BUDGET_MS);
  });

  it(`releases-for-track completes under ${BUDGET_MS}ms`, () => {
    const median = timeSpawn(["__complete", "releases-for-track", "com.example.app", "production"]);
    expect(median).toBeLessThan(BUDGET_MS);
  });

  it("unknown context exits silently without error", () => {
    const output = execFileSync(process.execPath, [BIN, "__complete", "nonexistent-context"], {
      stdio: "pipe",
      timeout: 5000,
    }).toString();
    expect(output).toBe("");
  });
});
