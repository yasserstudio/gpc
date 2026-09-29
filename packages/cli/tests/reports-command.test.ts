import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { mkdtemp, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mockDownloadStatsReport = vi.fn();
const mockDownloadFinancialReport = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    downloadStatsReport: mockDownloadStatsReport,
    downloadFinancialReport: mockDownloadFinancialReport,
  };
});

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({
      app: "com.example.app",
      reports: { bucket: "pubsite_prod_42" },
    }),
  };
});

vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return {
    ...actual,
    resolveAuth: vi.fn().mockResolvedValue({
      getAccessToken: vi.fn().mockResolvedValue("token"),
      getClientEmail: vi.fn().mockReturnValue("test@example.iam.gserviceaccount.com"),
    }),
  };
});

describe("reports download output-file permissions", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockDownloadStatsReport.mockResolvedValue({
      objectName: "stats/installs/installs_com.example.app_202606_overview.csv",
      csv: "Date,Installs\n2026-06-01,10\n",
    });
    mockDownloadFinancialReport.mockResolvedValue({
      objectName: "earnings/earnings_202606.zip",
      kind: "zip",
      entries: [],
      raw: Buffer.from("PK-archive-bytes"),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function run(args: string[]) {
    const { registerReportsCommands } = await import("../src/commands/reports.js");
    const program = new Command();
    program
      .option("-a, --app <package>", "App package name")
      .option("-o, --output <format>", "Output format");
    registerReportsCommands(program);
    await program.parseAsync(["node", "gpc", "reports", ...args]);
  }

  // `mode` on writeFile only applies at creation, so a pre-existing world-readable file
  // would keep revenue/PII readable by everyone on the machine.
  it("tightens an existing world-readable file to 0600 (stats CSV)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-reports-"));
    const out = join(dir, "installs.csv");
    await writeFile(out, "stale", { mode: 0o644 });
    expect((await stat(out)).mode & 0o777).toBe(0o644);

    await run([
      "download",
      "stats",
      "--type",
      "installs",
      "--month",
      "2026-06",
      "--output-file",
      out,
    ]);

    expect((await stat(out)).mode & 0o777).toBe(0o600);
  });

  it("tightens an existing world-readable file to 0600 (raw financial archive)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-reports-"));
    const out = join(dir, "earnings.zip");
    await writeFile(out, "stale", { mode: 0o644 });

    await run(["download", "financial", "--month", "2026-06", "--output-file", out]);

    expect((await stat(out)).mode & 0o777).toBe(0o600);
  });

  it("creates a new output file as 0600", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gpc-reports-"));
    const out = join(dir, "fresh.csv");

    await run([
      "download",
      "stats",
      "--type",
      "installs",
      "--month",
      "2026-06",
      "--output-file",
      out,
    ]);

    expect((await stat(out)).mode & 0o777).toBe(0o600);
  });
});
