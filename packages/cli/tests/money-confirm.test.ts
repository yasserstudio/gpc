import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

const mockRefundOrder = vi.fn();
const mockRevoke = vi.fn();
const mockRefundExternal = vi.fn();
const mockCancelV2 = vi.fn();
const mockDefer = vi.fn();
const mockUntarget = vi.fn();

vi.mock("@gpc-cli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/core")>();
  return {
    ...actual,
    refundOrder: mockRefundOrder,
    revokeSubscriptionPurchase: mockRevoke,
    refundExternalTransaction: mockRefundExternal,
    cancelSubscriptionV2: mockCancelV2,
    deferSubscriptionPurchase: mockDefer,
    untargetSubscriptionOffer: mockUntarget,
  };
});

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return { ...actual, loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }) };
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

vi.mock("@gpc-cli/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/api")>();
  return { ...actual, createApiClient: vi.fn().mockReturnValue({}) };
});

// Every command that moves money or changes what a subscriber pays must refuse a non-interactive run without --yes.
const CASES = [
  {
    name: "purchases orders refund",
    argv: ["purchases", "orders", "refund", "GPA.1234", "--revoke"],
    mock: mockRefundOrder,
  },
  {
    name: "purchases subscription revoke",
    argv: ["purchases", "subscription", "revoke", "sub-token", "--refund-type", "full"],
    mock: mockRevoke,
  },
  {
    name: "external-transactions refund",
    argv: ["external-transactions", "refund", "txn-1", "--full"],
    mock: mockRefundExternal,
  },
  {
    name: "purchases subscription cancel-v2",
    argv: ["purchases", "subscription", "cancel-v2", "sub-token"],
    mock: mockCancelV2,
  },
  {
    name: "purchases subscription defer",
    argv: [
      "purchases",
      "subscription",
      "defer",
      "premium_monthly",
      "sub-token",
      "--expiry",
      "2026-12-31T00:00:00Z",
    ],
    mock: mockDefer,
  },
  {
    name: "purchases subscription untarget-offer",
    argv: ["purchases", "subscription", "untarget-offer", "sub-token", "--offer", "save-30"],
    mock: mockUntarget,
  },
];

describe("money commands require --yes when non-interactive", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const c of CASES) c.mock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function run(argv: string[]) {
    const { registerPurchasesCommands } = await import("../src/commands/purchases.js");
    const { registerExternalTransactionsCommands } =
      await import("../src/commands/external-transactions.js");
    const program = new Command();
    program
      .option("-a, --app <package>")
      .option("-o, --output <format>")
      .option("-y, --yes")
      .option("--dry-run")
      .option("--no-interactive")
      .exitOverride();
    registerPurchasesCommands(program);
    registerExternalTransactionsCommands(program);
    return program.parseAsync(["node", "gpc", ...argv, "--no-interactive"]);
  }

  it.each(CASES)("$name refuses without --yes", async ({ argv, mock }) => {
    await expect(run(argv)).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      exitCode: 2,
    });
    expect(mock).not.toHaveBeenCalled();
  });

  it.each(CASES)("$name proceeds with --yes", async ({ argv, mock }) => {
    await run([...argv, "--yes"]);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each(CASES)("$name --dry-run sends nothing and needs no --yes", async ({ argv, mock }) => {
    await run(["--dry-run", ...argv]);
    expect(mock).not.toHaveBeenCalled();
  });
});
