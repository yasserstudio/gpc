import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initAudit, writeAuditLog, createAuditEntry } from "../src/audit";

describe("audit logging", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gpc-audit-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes audit log entry as JSONL", async () => {
    initAudit(testDir);

    const entry = createAuditEntry("releases upload", { file: "app.aab", track: "internal" }, "com.example.app");
    entry.success = true;
    entry.durationMs = 1234;

    await writeAuditLog(entry);

    const content = await readFile(join(testDir, "audit.log"), "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.command).toBe("releases upload");
    expect(parsed.app).toBe("com.example.app");
    expect(parsed.args.file).toBe("app.aab");
    expect(parsed.success).toBe(true);
    expect(parsed.durationMs).toBe(1234);
    expect(parsed.timestamp).toBeTruthy();
  });

  it("appends multiple entries", async () => {
    initAudit(testDir);

    await writeAuditLog(createAuditEntry("publish", { file: "a.aab" }));
    await writeAuditLog(createAuditEntry("config init", { path: "/config" }));

    const content = await readFile(join(testDir, "audit.log"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).command).toBe("publish");
    expect(JSON.parse(lines[1]!).command).toBe("config init");
  });

  it("creates directory if it does not exist", async () => {
    const nestedDir = join(testDir, "nested", "deep");
    initAudit(nestedDir);

    await writeAuditLog(createAuditEntry("test", {}));

    const content = await readFile(join(nestedDir, "audit.log"), "utf-8");
    expect(JSON.parse(content.trim()).command).toBe("test");
  });

  it("does not throw when auditDir is not set", async () => {
    initAudit(null as any);
    // Should silently no-op
    await expect(writeAuditLog(createAuditEntry("test", {}))).resolves.toBeUndefined();
  });

  it("createAuditEntry sets timestamp", () => {
    const entry = createAuditEntry("releases upload", { track: "beta" }, "com.app");
    expect(entry.timestamp).toBeTruthy();
    expect(entry.command).toBe("releases upload");
    expect(entry.app).toBe("com.app");
    expect(entry.args.track).toBe("beta");
    expect(entry.success).toBeUndefined();
  });
});
