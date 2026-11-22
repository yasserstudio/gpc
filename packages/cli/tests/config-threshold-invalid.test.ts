import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A config `vitals.thresholds` value that is blank, a boolean or not a
// number used to become Number(v) = 0 (or pass through as a string), so a gate
// fired on any crash or was silently wrong. It must be rejected with
// THRESHOLD_INVALID (exit 2) before any API call, as `gpc status` already does.
// Drives the REAL createProgram(); only config, auth and the API clients are mocked.

const config: { current: Record<string, unknown> } = { current: {} };

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn(async () => config.current),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return {
    ...actual,
    resolveAuth: vi.fn().mockResolvedValue({
      getAccessToken: vi.fn().mockResolvedValue("token"),
      getClientEmail: vi.fn().mockReturnValue("ci@example.iam.gserviceaccount.com"),
    }),
  };
});

const reportingQuery = vi.fn();
vi.mock("@gpc-cli/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/api")>();
  return {
    ...actual,
    createReportingClient: vi.fn(() => ({ queryMetricSet: reportingQuery })),
    createApiClient: vi.fn(() => ({})),
  };
});

async function runCli(
  ...args: string[]
): Promise<{ code?: string; exitCode?: number } | undefined> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  try {
    const { createProgram, runProgram } = await import("../src/program.js");
    await runProgram(await createProgram(), argv);
    return undefined;
  } catch (e) {
    return e as { code?: string; exitCode?: number };
  } finally {
    process.argv = origArgv;
  }
}

function withThreshold(key: string, value: unknown): Record<string, unknown> {
  return { app: "com.example.app", vitals: { thresholds: { [key]: value } } };
}

const BAD_VALUES: unknown[] = ["", "   ", false, true, "abc", "2%", {}];

describe("invalid config vitals.thresholds values are rejected, not read as 0", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    reportingQuery.mockResolvedValue({ rows: [] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    reportingQuery.mockReset();
    process.exitCode = undefined;
  });

  it.each(BAD_VALUES)("gpc vitals crashes with crashRate %j exits 2 before querying", async (v) => {
    config.current = withThreshold("crashRate", v);
    const err = await runCli("vitals", "crashes");
    expect(err?.code).toBe("THRESHOLD_INVALID");
    expect(err?.exitCode).toBe(2);
    expect(reportingQuery).not.toHaveBeenCalled();
  });

  it("a count threshold (error-count) is checked the same way", async () => {
    config.current = withThreshold("errorReportCount", "");
    const err = await runCli("vitals", "error-count");
    expect(err?.code).toBe("THRESHOLD_INVALID");
    expect(err?.exitCode).toBe(2);
    expect(reportingQuery).not.toHaveBeenCalled();
  });

  it("is rejected before credentials are resolved (exit 2, not an auth error)", async () => {
    const { resolveAuth } = await import("@gpc-cli/auth");
    vi.mocked(resolveAuth).mockClear();
    config.current = withThreshold("crashRate", "");
    await runCli("vitals", "crashes");
    expect(resolveAuth).not.toHaveBeenCalled();
  });

  it("a valid --threshold flag still wins over a bad config value", async () => {
    config.current = withThreshold("crashRate", "");
    const err = await runCli("vitals", "crashes", "--threshold", "0.02");
    expect(err?.code).not.toBe("THRESHOLD_INVALID");
    expect(reportingQuery).toHaveBeenCalled();
  });

  it("null means not set, as in gpc status: no gate, no error", async () => {
    config.current = withThreshold("crashRate", null);
    const err = await runCli("vitals", "crashes");
    expect(err).toBeUndefined();
  });

  it.each(BAD_VALUES)("gpc watch with crashRate %j exits 2 instead of gating at 0", async (v) => {
    config.current = withThreshold("crashRate", v);
    const err = await runCli("watch", "--rounds", "1");
    expect(err?.code).toBe("THRESHOLD_INVALID");
    expect(err?.exitCode).toBe(2);
    expect(reportingQuery).not.toHaveBeenCalled();
  });

  it("releases rollout increase --vitals-gate --dry-run checks the config too", async () => {
    config.current = withThreshold("crashRate", "");
    const err = await runCli(
      "--dry-run",
      "releases",
      "rollout",
      "increase",
      "--track",
      "production",
      "--to",
      "50",
      "--vitals-gate",
    );
    expect(err?.code).toBe("THRESHOLD_INVALID");
  });

  it.each(BAD_VALUES)(
    "releases rollout increase --vitals-gate with crashRate %j exits 2",
    async (v) => {
      config.current = withThreshold("crashRate", v);
      const err = await runCli(
        "releases",
        "rollout",
        "increase",
        "--track",
        "production",
        "--to",
        "50",
        "--vitals-gate",
      );
      expect(err?.code).toBe("THRESHOLD_INVALID");
      expect(err?.exitCode).toBe(2);
      expect(reportingQuery).not.toHaveBeenCalled();
    },
  );

  it("valid thresholds still work: a numeric string and a number are accepted", async () => {
    for (const v of ["0.02", 0.02, 0]) {
      config.current = withThreshold("crashRate", v);
      const err = await runCli("vitals", "crashes");
      expect(err?.code, JSON.stringify(v)).not.toBe("THRESHOLD_INVALID");
    }
    expect(reportingQuery).toHaveBeenCalled();
  });
});
