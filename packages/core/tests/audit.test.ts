import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initAudit, writeAuditLog, createAuditEntry, listAuditEvents, searchAuditEvents, clearAuditLog } from "../src/audit";

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

    const entry = createAuditEntry(
      "releases upload",
      { file: "app.aab", track: "internal" },
      "com.example.app",
    );
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

  it("listAuditEvents returns all entries", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("releases upload", { file: "a.aab" }, "com.app"));
    await writeAuditLog(createAuditEntry("config init", { path: "/" }));

    const events = await listAuditEvents();
    expect(events).toHaveLength(2);
    expect(events[0]!.command).toBe("releases upload");
    expect(events[1]!.command).toBe("config init");
  });

  it("listAuditEvents filters by limit", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("cmd1", {}));
    await writeAuditLog(createAuditEntry("cmd2", {}));
    await writeAuditLog(createAuditEntry("cmd3", {}));

    const events = await listAuditEvents({ limit: 2 });
    expect(events).toHaveLength(2);
    expect(events[0]!.command).toBe("cmd2");
    expect(events[1]!.command).toBe("cmd3");
  });

  it("listAuditEvents filters by command", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("releases upload", {}));
    await writeAuditLog(createAuditEntry("config init", {}));
    await writeAuditLog(createAuditEntry("releases promote", {}));

    const events = await listAuditEvents({ command: "releases" });
    expect(events).toHaveLength(2);
    expect(events[0]!.command).toBe("releases upload");
    expect(events[1]!.command).toBe("releases promote");
  });

  it("listAuditEvents filters by since", async () => {
    initAudit(testDir);
    const old = createAuditEntry("old-cmd", {});
    old.timestamp = "2020-01-01T00:00:00.000Z";
    await writeAuditLog(old);
    await writeAuditLog(createAuditEntry("new-cmd", {}));

    const events = await listAuditEvents({ since: "2025-01-01" });
    expect(events).toHaveLength(1);
    expect(events[0]!.command).toBe("new-cmd");
  });

  it("listAuditEvents returns empty when no audit dir", async () => {
    initAudit(null as any);
    const events = await listAuditEvents();
    expect(events).toEqual([]);
  });

  it("searchAuditEvents finds matching entries", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("releases upload", { file: "app.aab" }, "com.example"));
    await writeAuditLog(createAuditEntry("config init", { path: "/" }));

    const results = await searchAuditEvents("upload");
    expect(results).toHaveLength(1);
    expect(results[0]!.command).toBe("releases upload");
  });

  it("searchAuditEvents is case-insensitive", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("releases UPLOAD", {}));

    const results = await searchAuditEvents("upload");
    expect(results).toHaveLength(1);
  });

  it("clearAuditLog clears all entries", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("cmd1", {}));
    await writeAuditLog(createAuditEntry("cmd2", {}));

    const result = await clearAuditLog();
    expect(result.deleted).toBe(2);
    expect(result.remaining).toBe(0);

    const remaining = await listAuditEvents();
    expect(remaining).toHaveLength(0);
  });

  it("clearAuditLog with before date keeps recent entries", async () => {
    initAudit(testDir);
    const old = createAuditEntry("old-cmd", {});
    old.timestamp = "2020-01-01T00:00:00.000Z";
    await writeAuditLog(old);
    await writeAuditLog(createAuditEntry("new-cmd", {}));

    const result = await clearAuditLog({ before: "2025-01-01" });
    expect(result.deleted).toBe(1);
    expect(result.remaining).toBe(1);

    const remaining = await listAuditEvents();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.command).toBe("new-cmd");
  });

  it("clearAuditLog dry-run does not delete", async () => {
    initAudit(testDir);
    await writeAuditLog(createAuditEntry("cmd1", {}));

    const result = await clearAuditLog({ dryRun: true });
    expect(result.deleted).toBe(1);
    expect(result.remaining).toBe(0);

    const remaining = await listAuditEvents();
    expect(remaining).toHaveLength(1);
  });

  it("clearAuditLog returns zeros when no audit dir", async () => {
    initAudit(null as any);
    const result = await clearAuditLog();
    expect(result).toEqual({ deleted: 0, remaining: 0 });
  });
});
