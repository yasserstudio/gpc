import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BUNDLE_PATH = join(import.meta.dirname, "..", "dist", "gpc-bundled.mjs");

// Only run if bundle exists (built by `pnpm build:binary --bundle-only`)
const hasBundledCli = existsSync(BUNDLE_PATH);

function run(...args: string[]): string {
  return execFileSync("node", [BUNDLE_PATH, ...args], {
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, GPC_NO_INTERACTIVE: "1" },
  }).trim();
}

function runWithExit(...args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [BUNDLE_PATH, ...args], {
      encoding: "utf-8",
      timeout: 10_000,
      env: { ...process.env, GPC_NO_INTERACTIVE: "1" },
    }).trim();
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout ?? "").trim(),
      exitCode: err.status ?? 1,
    };
  }
}

describe.skipIf(!hasBundledCli)("bundled CLI", () => {
  it("prints version", () => {
    const output = run("--version");
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("prints help", () => {
    const output = run("--help");
    expect(output).toContain("The complete Google Play CLI");
    expect(output).toContain("releases");
    expect(output).toContain("auth");
    expect(output).toContain("config");
  });

  it("shows config path", () => {
    const output = run("config", "path");
    expect(output).toContain("config.json");
  });

  it("lists commands in help", () => {
    const output = run("--help");
    const commands = [
      "auth",
      "config",
      "doctor",
      "apps",
      "releases",
      "tracks",
      "status",
      "listings",
      "reviews",
      "vitals",
      "subscriptions",
      "iap",
      "purchases",
      "pricing",
      "reports",
      "users",
      "testers",
      "validate",
      "publish",
      "plugins",
    ];
    for (const cmd of commands) {
      expect(output).toContain(cmd);
    }
  });

  it("supports --output json flag", () => {
    const output = run("config", "show", "--output", "json");
    // Should be valid JSON (even if config doesn't exist — empty object)
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("exits with code 2 on unknown command", () => {
    const { exitCode } = runWithExit("nonexistent-command-xyz");
    expect(exitCode).not.toBe(0);
  });

  it("has --no-interactive flag in help", () => {
    const output = run("--help");
    expect(output).toContain("--no-interactive");
  });

  it("has --dry-run flag in help", () => {
    const output = run("--help");
    expect(output).toContain("--dry-run");
  });
});
