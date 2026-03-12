import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CLI_PATH = join(import.meta.dirname, "..", "packages", "cli", "dist", "bin.js");
const hasCliDist = existsSync(CLI_PATH);

function runWithExit(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout: 15_000,
      env: {
        ...process.env,
        GPC_NO_INTERACTIVE: "1",
        // Clear auth-related env vars to ensure no credentials
        GOOGLE_APPLICATION_CREDENTIALS: "",
        GPC_SERVICE_ACCOUNT_KEY: "",
        GPC_KEY_FILE: "",
      },
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

describe.skipIf(!hasCliDist)("CLI error handling", () => {
  it("command requiring auth without credentials produces auth error output", () => {
    const { exitCode, stdout, stderr } = runWithExit("releases", "list", "--app", "com.example.nonexistent");
    const combined = stdout + stderr;
    // Should exit non-zero with an auth or API error
    if (exitCode === 0) {
      // If it exits 0, it should still have printed an error/auth message
      expect(combined).toMatch(/credential|auth|error|not found/i);
    } else {
      expect([1, 3, 4]).toContain(exitCode);
    }
  });

  it("unknown command produces error output", () => {
    const { stdout, stderr } = runWithExit("totally-fake-command");
    const combined = stdout + stderr;
    // Commander outputs "error: unknown command" to stderr
    expect(combined).toMatch(/unknown command|error/i);
  });

  it("validate with nonexistent file handles gracefully", () => {
    const { exitCode, stdout, stderr } = runWithExit("validate", "nonexistent-file-abc123.aab");
    // Should fail but not crash — exit 1 (error) or 2 (usage)
    expect(exitCode).not.toBe(0);
    const combined = stdout + stderr;
    // Should produce some output (error message), not silently fail
    expect(combined.length).toBeGreaterThan(0);
  });

  it("apps list with invalid app ID exits with non-zero", () => {
    const { exitCode } = runWithExit("apps", "get", "--app", "not.a.real.package.xyz");
    expect(exitCode).not.toBe(0);
  });

  it("--output with unknown format falls through to JSON", () => {
    const { exitCode, stdout } = runWithExit("config", "show", "--output", "invalid-format-xyz");
    // GPC falls through to JSON for unknown formats — verify it doesn't crash
    expect(exitCode).toBe(0);
    // Output should still be valid (either JSON or the format's fallback)
    expect(stdout.length).toBeGreaterThan(0);
  });
});
