import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CLI_PATH = join(import.meta.dirname, "..", "packages", "cli", "dist", "bin.js");
const hasCliDist = existsSync(CLI_PATH);

function run(...args: string[]): string {
  return execFileSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, GPC_NO_INTERACTIVE: "1" },
  }).trim();
}

function runWithExit(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout: 15_000,
      env: { ...process.env, GPC_NO_INTERACTIVE: "1" },
    }).trim();
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout ?? "").trim(),
      stderr: (err.stderr ?? "").trim(),
      exitCode: err.status ?? 1,
    };
  }
}

describe.skipIf(!hasCliDist)("CLI commands", () => {
  describe("gpc --version", () => {
    it("returns a semver-like string", () => {
      const output = run("--version");
      expect(output).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("gpc doctor", () => {
    // doctor performs real DNS + HTTPS resolution against googleapis.com
    // endpoints. The default vitest 5s test timeout is too tight for that
    // under normal network conditions (observed ~7s cold). Match the child-
    // process timeout to avoid a flaky e2e that doesn't actually exercise
    // anything the shorter ceiling would catch.
    it("runs without crashing (exit 0 or 1, not 2)", () => {
      const { exitCode } = runWithExit("doctor");
      // doctor may fail on auth (exit 1) but should not crash or show usage error (exit 2)
      expect(exitCode).not.toBe(2);
      expect([0, 1]).toContain(exitCode);
    }, 20_000);
  });

  describe("gpc config show --output json", () => {
    it("returns valid JSON", () => {
      const output = run("config", "show", "--output", "json");
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe("gpc config path", () => {
    it("prints a file path", () => {
      const output = run("config", "path");
      expect(output.length).toBeGreaterThan(0);
      // Should contain a path-like string with config in it
      expect(output).toMatch(/config/i);
    });
  });

  describe("--help for major commands", () => {
    const commands = [
      "apps",
      "auth",
      "config",
      "releases",
      "listings",
      "reviews",
      "vitals",
      "subscriptions",
      "purchases",
      "reports",
    ];

    for (const cmd of commands) {
      it(`gpc ${cmd} --help exits 0`, () => {
        const { exitCode, stdout } = runWithExit(cmd, "--help");
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
      });
    }
  });
});
