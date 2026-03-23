import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { secretsScanner } from "../src/preflight/scanners/secrets-scanner";
import type { PreflightContext } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(sourceDir: string): PreflightContext {
  return { sourceDir, config: { ...DEFAULT_PREFLIGHT_CONFIG } };
}

describe("secretsScanner", () => {
  const tmpDir = join(tmpdir(), "gpc-test-secrets-scanner");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns no findings for clean code", async () => {
    await writeFile(
      join(tmpDir, "App.kt"),
      `
      class App {
        fun main() { println("Hello") }
      }
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    expect(findings).toEqual([]);
  });

  it("detects AWS access keys", async () => {
    await writeFile(
      join(tmpDir, "config.ts"),
      `
      const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-aws-key");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("detects Google API keys", async () => {
    await writeFile(
      join(tmpDir, "config.json"),
      `{
      "apiKey": "AIzaSyC-EXAMPLEkeyFORtesting1234567890ab"
    }`,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-google-api-key");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("detects Stripe secret keys", async () => {
    await writeFile(
      join(tmpDir, "Payment.java"),
      `
      String key = "sk_live_abcdefghijklmnopqrstuvwx";
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-stripe-key");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("detects private keys", async () => {
    await writeFile(
      join(tmpDir, "key.properties"),
      `
      -----BEGIN RSA PRIVATE KEY-----
      MIIEpAIBAAKCAQEA...
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-private-key");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("detects generic API tokens", async () => {
    await writeFile(
      join(tmpDir, "config.kt"),
      `
      val apiKey = "abc123def456ghi789jkl012mno"
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-generic-token");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("skips node_modules directory", async () => {
    const nmDir = join(tmpDir, "node_modules", "some-lib");
    await mkdir(nmDir, { recursive: true });
    await writeFile(
      join(nmDir, "index.js"),
      `
      const key = "sk_live_abcdefghijklmnopqrstuvwx";
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    expect(findings).toEqual([]);
  });

  it("skips build directory", async () => {
    const buildDir = join(tmpDir, "build", "outputs");
    await mkdir(buildDir, { recursive: true });
    await writeFile(
      join(buildDir, "config.json"),
      `{
      "key": "AKIAIOSFODNN7EXAMPLE"
    }`,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    expect(findings).toEqual([]);
  });

  it("scans nested directories", async () => {
    const nested = join(tmpDir, "src", "main", "kotlin");
    await mkdir(nested, { recursive: true });
    await writeFile(
      join(nested, "Config.kt"),
      `
      val KEY = "AKIAIOSFODNN7EXAMPLE"
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    expect(findings.length).toBeGreaterThan(0);
  });

  it("reports file path and line number", async () => {
    await writeFile(
      join(tmpDir, "secrets.ts"),
      `line1
line2
const key = "AKIAIOSFODNN7EXAMPLE";
line4`,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "secret-aws-key");
    expect(f).toBeDefined();
    expect(f!.title).toContain("secrets.ts:3");
  });

  it("detects multiple secrets in same file", async () => {
    await writeFile(
      join(tmpDir, "multi.kt"),
      `
      val aws = "AKIAIOSFODNN7EXAMPLE"
      val stripe = "sk_live_abcdefghijklmnopqrstuvwx"
    `,
    );
    const findings = await secretsScanner.scan(makeCtx(tmpDir));
    expect(findings.length).toBe(2);
  });
});
