import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * End-to-end integration: generate a bash completion script, source it in a
 * subshell, simulate TAB completion for each dynamic flag, and assert the
 * COMPREPLY array contains values from a real `gpc __complete` invocation.
 *
 * Catches shell-dialect bugs that string-matching tests miss (e.g. a syntax
 * error in the generator would compile fine but fail on `source`).
 *
 * Skipped when dist/bin.js is absent (local watch mode).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "dist", "bin.js");

function run(cmd: string, env: NodeJS.ProcessEnv = {}): string {
  return execFileSync("bash", ["-c", cmd], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 10_000,
  });
}

describe.skipIf(!existsSync(BIN))("shell completion end-to-end", () => {
  let sandbox: string;
  let script: string;

  // Build a hermetic config + cache so completion has predictable values.
  beforeAll(() => {
    sandbox = mkdtempSync(join(tmpdir(), "gpc-e2e-"));
    const configDir = join(sandbox, "config", "gpc");
    const cacheDir = join(sandbox, "cache", "gpc");
    mkdirSync(configDir, { recursive: true });
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        app: "com.example.default",
        profiles: {
          dev: { app: "com.example.dev" },
          prod: { app: "com.example.prod" },
        },
      }),
    );
    writeFileSync(
      join(cacheDir, "status-com.example.dev.json"),
      JSON.stringify({
        fetchedAt: new Date().toISOString(),
        ttl: 3600,
        data: {
          releases: [
            { track: "production", versionCode: "100" },
            { track: "qa-ring", versionCode: "101" },
          ],
        },
      }),
    );

    // Generate the bash script against our hermetic env
    script = execFileSync(process.execPath, [BIN, "completion", "bash"], {
      encoding: "utf-8",
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(sandbox, "config"),
        XDG_CACHE_HOME: join(sandbox, "cache"),
      },
    });
  });

  afterAll(() => {
    if (sandbox) rmSync(sandbox, { recursive: true, force: true });
  });

  function simulateTab(cmdline: string[]): string[] {
    // Create a bash shim that routes `gpc` to our dist binary with the
    // hermetic XDG env pointing at the sandbox.
    const shim = `
      export XDG_CONFIG_HOME="${join(sandbox, "config")}"
      export XDG_CACHE_HOME="${join(sandbox, "cache")}"
      gpc() { node "${BIN}" "$@"; }
      export -f gpc
      ${script}
      COMP_WORDS=(${cmdline.map((w) => `"${w}"`).join(" ")})
      COMP_CWORD=${cmdline.length - 1}
      _gpc
      printf '%s\\n' "\${COMPREPLY[@]}"
    `;
    const out = run(shim);
    return out.split("\n").filter(Boolean);
  }

  it("completes --profile with hermetic profile names", () => {
    const reply = simulateTab(["gpc", "--profile", ""]);
    expect(reply.sort()).toEqual(["dev", "prod"]);
  });

  it("completes --app with hermetic package names", () => {
    const reply = simulateTab(["gpc", "--app", ""]);
    expect(reply).toContain("com.example.default");
    expect(reply).toContain("com.example.dev");
    expect(reply).toContain("com.example.prod");
  });

  it("filters --app completions by the typed prefix", () => {
    const reply = simulateTab(["gpc", "--app", "com.example.d"]);
    expect(reply).toContain("com.example.dev");
    expect(reply).toContain("com.example.default");
    expect(reply).not.toContain("com.example.prod");
  });

  it("completes --track including custom tracks from cache", () => {
    const reply = simulateTab(["gpc", "vitals", "crashes", "--track", ""]);
    expect(reply).toContain("production");
    expect(reply).toContain("qa-ring");
  });
});
