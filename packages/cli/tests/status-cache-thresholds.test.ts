import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { AppStatus } from "@gpc-cli/core";

// A cached status must be rated against the thresholds of the current run, not
// the ones saved with it. Drives the real createProgram().

const loadConfig = vi.fn();
vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return { ...actual, loadConfig };
});

const resolveAuth = vi.fn();
vi.mock("@gpc-cli/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/auth")>();
  return { ...actual, resolveAuth };
});

// Saved by an earlier `gpc status --threshold crashes=50` (0.5 as a fraction).
const baseCached: AppStatus = {
  packageName: "com.example.app",
  fetchedAt: new Date().toISOString(),
  cached: true,
  sections: ["releases", "vitals", "reviews"],
  releases: [],
  vitals: {
    windowDays: 7,
    crashes: { value: 0.005, threshold: 0.5, status: "ok" },
    anr: { value: 0.001, threshold: 0.01, status: "ok" },
    slowStarts: { value: 0.01, threshold: 0.05, status: "ok" },
    slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
  },
  reviews: {
    windowDays: 30,
    averageRating: undefined,
    previousAverageRating: undefined,
    totalNew: 0,
    positivePercent: undefined,
  },
};

let cached: AppStatus | null = baseCached;
// What a live fetch returns: the cached status, freshly fetched.
const getAppStatus = vi.fn(async () => ({ ...baseCached, cached: false }));
vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    loadStatusCache: vi.fn(async () => cached),
    saveStatusCache: vi.fn(),
    getAppStatus,
  };
});

async function runCli(...args: string[]): Promise<AppStatus> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
    return JSON.parse(String(log.mock.calls[0]?.[0])) as AppStatus;
  } finally {
    process.argv = origArgv;
    log.mockRestore();
  }
}

// Runs a command whose output is not one JSON document (e.g. --all-apps).
async function runCliRaw(...args: string[]): Promise<void> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
  } finally {
    process.argv = origArgv;
    err.mockRestore();
    log.mockRestore();
  }
}

describe("gpc status served from cache", () => {
  beforeEach(() => {
    cached = baseCached;
    loadConfig.mockResolvedValue({ app: "com.example.app" });
    resolveAuth.mockResolvedValue({});
  });
  afterEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("applies --threshold to a cached status", async () => {
    const out = await runCli("status", "-o", "json", "--threshold", "crashes=0.1");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.001, status: "breach" });
    expect(process.exitCode).toBe(6);
    expect(resolveAuth).not.toHaveBeenCalled();
  });

  it("uses the default threshold, not the one saved by an earlier run", async () => {
    const out = await runCli("status", "-o", "json");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.02, status: "ok" });
  });

  it("applies --threshold with --cached", async () => {
    const out = await runCli("status", "-o", "json", "--cached", "--threshold", "crashes=0.1");
    expect(out.vitals.crashes).toMatchObject({ threshold: 0.001, status: "breach" });
    expect(process.exitCode).toBe(6);
  });

  it("fetches live when the cache lacks a requested section", async () => {
    cached = { ...baseCached, sections: ["releases"] };
    await runCli("status", "-o", "json", "--threshold", "crashes=0.1");
    expect(getAppStatus).toHaveBeenCalledOnce();
  });

  it("fetches live when the cache covers a different --days window", async () => {
    await runCli("status", "-o", "json", "--days", "28");
    expect(getAppStatus).toHaveBeenCalledOnce();
  });

  it("fetches live when the cache covers a different --review-days window", async () => {
    await runCli("status", "-o", "json", "--review-days", "7");
    expect(getAppStatus).toHaveBeenCalledOnce();
  });

  it("fetches live when the cache saved a section error", async () => {
    cached = { ...baseCached, errors: ["vitals/crashes: 503"] };
    await runCli("status", "-o", "json");
    expect(getAppStatus).toHaveBeenCalledOnce();
  });

  it("does not gate on cached vitals the run did not ask for", async () => {
    await runCli("status", "-o", "json", "--sections", "releases", "--threshold", "crashes=0.1");
    expect(getAppStatus).not.toHaveBeenCalled();
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("rejects a --ttl that is not a number, such as an unset CI variable", async () => {
    await expect(runCli("status", "-o", "json", "--ttl", "")).rejects.toMatchObject({
      exitCode: 2,
    });
    expect(getAppStatus).not.toHaveBeenCalled();
  });

  it("refuses --cached when the cache lacks a requested section", async () => {
    cached = { ...baseCached, sections: ["releases"] };
    await expect(runCli("status", "-o", "json", "--cached")).rejects.toMatchObject({
      code: "STATUS_NO_CACHE",
      exitCode: 2,
    });
  });
});

describe("gpc status threshold gate with unreadable vitals", () => {
  const unreadable = {
    ...baseCached,
    cached: false,
    vitals: {
      ...baseCached.vitals,
      crashes: { value: undefined, threshold: 0.02, status: "unknown" as const },
    },
    errors: ["vitals/crashes: Error: 403 forbidden"],
  };
  beforeEach(() => {
    cached = null;
    loadConfig.mockResolvedValue({ app: "com.example.app" });
    resolveAuth.mockResolvedValue({});
  });
  afterEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("exits 4 when a gate is set and a vitals query failed", async () => {
    getAppStatus.mockResolvedValueOnce(unreadable);
    await expect(runCli("status", "-o", "json", "--threshold", "crashes=2")).rejects.toMatchObject({
      code: "STATUS_VITALS_UNREADABLE",
      exitCode: 4,
    });
  });

  it("exits 4 when config thresholds are set and a vitals query failed", async () => {
    loadConfig.mockResolvedValue({
      app: "com.example.app",
      vitals: { thresholds: { crashRate: 0.02 } },
    });
    getAppStatus.mockResolvedValueOnce(unreadable);
    await expect(runCli("status", "-o", "json")).rejects.toMatchObject({ exitCode: 4 });
  });

  it("keeps exit 0 without a gate", async () => {
    getAppStatus.mockResolvedValueOnce(unreadable);
    await runCli("status", "-o", "json");
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("--all-apps exits non-zero when one app fails", async () => {
    loadConfig.mockResolvedValue({
      app: "com.example.app",
      profiles: { other: { app: "com.example.other" } },
    });
    getAppStatus
      .mockResolvedValueOnce({ ...baseCached, cached: false })
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { exitCode: 4 }));
    await runCliRaw("status", "-o", "json", "--all-apps");
    expect(process.exitCode).toBe(4);
  });

  it("--all-apps reports a failure over another app's breach", async () => {
    loadConfig.mockResolvedValue({
      app: "com.example.app",
      profiles: { other: { app: "com.example.other" } },
    });
    // crashes 0.005 breaches a 0.1% threshold on the first app.
    getAppStatus
      .mockResolvedValueOnce({ ...baseCached, cached: false })
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { exitCode: 4 }));
    await runCliRaw("status", "-o", "json", "--all-apps", "--threshold", "crashes=0.1");
    expect(process.exitCode).toBe(4);
  });
});
