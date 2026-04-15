import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Cold-start perf guard for `gpc __complete`.
 *
 * Shell completion fires on every TAB press. User-facing target is ~150ms
 * on node / ~80ms on the standalone binary. The in-test budget is 500ms
 * because vitest's parallel transformation load inflates spawn cost 2–3x on
 * CI — this test guards against order-of-magnitude regressions, not the
 * real user latency (validated manually before each release).
 *
 * Runs only when the built bin is present. Turborepo wires `test.dependsOn:
 * ["build"]`, so CI always exercises this; local watch mode skips gracefully.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "dist", "bin.js");
const BUDGET_MS = 500;
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

  // Regression guard for bin.ts: the update-check race inside bin.ts used to
  // block exit for ~3s on every command because its setTimeout kept the event
  // loop alive. `__complete` now short-circuits that path. If the guard is
  // removed, this test catches it — the budget is a 10x margin over the
  // observed post-fix latency (~150ms cold).
  it("does NOT block for update-check (would be 3s+ if the guard regressed)", () => {
    const start = Date.now();
    execFileSync(process.execPath, [BIN, "__complete", "profiles"], {
      stdio: "pipe",
      timeout: 5000,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1500);
  });
});
