import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram() (v0.9.95 lesson: synthetic roots miss global
// flag collisions); only the API client is mocked.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const getClient = vi.fn();
vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: (...a: unknown[]) => getClient(...a),
}));

const ETAG = "CgQIARAB";

async function runCli(...args: string[]): Promise<string> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const { createProgram, runProgram } = await import("../src/program.js");
    const program = await createProgram();
    await runProgram(program, argv);
    return log.mock.calls.map((c) => String(c[0])).join("\n");
  } finally {
    process.argv = origArgv;
  }
}

describe("--etag on purchases subscription cancel-v2 and revoke", () => {
  const cancelSubscriptionV2 = vi.fn();
  const revokeSubscriptionV2 = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    cancelSubscriptionV2.mockResolvedValue(undefined);
    revokeSubscriptionV2.mockResolvedValue(undefined);
    getClient.mockResolvedValue({ purchases: { cancelSubscriptionV2, revokeSubscriptionV2 } });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    getClient.mockReset();
    cancelSubscriptionV2.mockReset();
    revokeSubscriptionV2.mockReset();
    process.exitCode = undefined;
  });

  it("cancel-v2 sends no etag when the flag is absent", async () => {
    await runCli("purchases", "subscription", "cancel-v2", "tok-1", "--yes");
    const body = cancelSubscriptionV2.mock.calls[0][2];
    expect(body.cancellationContext).not.toHaveProperty("etag");
  });

  it("cancel-v2 --etag sends it in cancellationContext", async () => {
    await runCli("purchases", "subscription", "cancel-v2", "tok-1", "--etag", ETAG, "--yes");
    expect(cancelSubscriptionV2.mock.calls[0][2].cancellationContext.etag).toBe(ETAG);
  });

  it("revoke sends no etag when the flag is absent", async () => {
    await runCli("purchases", "subscription", "revoke", "tok-1", "--refund-type", "full", "--yes");
    expect(revokeSubscriptionV2.mock.calls[0][2].revocationContext).not.toHaveProperty("etag");
  });

  it("revoke --etag sends it in revocationContext", async () => {
    await runCli("purchases", "subscription", "revoke", "tok-1", "--etag", ETAG, "--yes");
    expect(revokeSubscriptionV2.mock.calls[0][2].revocationContext).toEqual({
      proratedRefund: {},
      etag: ETAG,
    });
  });

  it("a blank --etag fails with exit 2 before anything is sent, even on --dry-run", async () => {
    for (const argv of [
      ["purchases", "subscription", "cancel-v2", "tok-1", "--etag", " ", "--yes"],
      ["--dry-run", "purchases", "subscription", "revoke", "tok-1", "--etag", ""],
      ["--dry-run", "purchases", "subscription", "cancel-v2", "tok-1", "--etag", ""],
    ]) {
      const err = await runCli(...argv).then(
        () => undefined,
        (e: { code?: string; exitCode?: number }) => e,
      );
      expect(err?.code, argv.join(" ")).toBe("SUBSCRIPTION_ETAG_BLANK");
      expect(err?.exitCode).toBe(2);
    }
    expect(cancelSubscriptionV2).not.toHaveBeenCalled();
    expect(revokeSubscriptionV2).not.toHaveBeenCalled();
  });

  it("--dry-run shows the etag guard and sends nothing", async () => {
    const out = await runCli(
      "--dry-run",
      "--output",
      "json",
      "purchases",
      "subscription",
      "cancel-v2",
      "tok-1",
      "--etag",
      ETAG,
    );
    expect(getClient).not.toHaveBeenCalled();
    expect(out).toContain(ETAG);
  });
});
