import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRefundOrder = vi.fn();
const mockRevoke = vi.fn();
const mockRefundExternal = vi.fn();
const mockCancelV2 = vi.fn();
const mockDefer = vi.fn();
const mockUntarget = vi.fn();
const mockCancelV1 = vi.fn();
const mockDeferV2 = vi.fn();

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
    cancelSubscriptionPurchase: mockCancelV1,
    deferSubscriptionV2: mockDeferV2,
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
    name: "purchases subscription cancel (v1)",
    argv: ["purchases", "subscription", "cancel", "premium_monthly", "sub-token"],
    mock: mockCancelV1,
  },
  {
    name: "purchases subscription defer-v2",
    argv: ["purchases", "subscription", "defer-v2", "sub-token", "--duration", "2592000s"],
    mock: mockDeferV2,
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
    mockDeferV2.mockResolvedValue({
      itemExpiryTimeDetails: [{ productId: "premium_monthly", expiryTime: "2027-01-30T00:00:00Z" }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function run(argv: string[]) {
    // Drive the real program so global flags resolve the way users hit them.
    const full = ["node", "gpc", ...argv, "--no-interactive"];
    const origArgv = process.argv;
    process.argv = full;
    try {
      const { createProgram } = await import("../src/program.js");
      const program = await createProgram();
      program.exitOverride();
      await program.parseAsync(full);
    } finally {
      process.argv = origArgv;
    }
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

// Bad values must fail before a dry run or a prompt, so a CI dry run cannot pass
// on input the real run rejects.
describe("subscription inputs are checked before a dry run", () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => {
      logs.push(a.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function dryRun(argv: string[]) {
    const full = ["node", "gpc", "--no-interactive", "--dry-run", ...argv];
    const origArgv = process.argv;
    process.argv = full;
    try {
      const { createProgram } = await import("../src/program.js");
      const program = await createProgram();
      program.exitOverride();
      await program.parseAsync(full);
    } finally {
      process.argv = origArgv;
    }
  }

  it("cancel-v2 rejects a blank --type", async () => {
    await expect(
      dryRun(["purchases", "subscription", "cancel-v2", "sub-token", "--type", ""]),
    ).rejects.toMatchObject({ code: "CANCELLATION_TYPE_INVALID", exitCode: 2 });
  });

  it("defer rejects an impossible date", async () => {
    await expect(
      dryRun([
        "purchases",
        "subscription",
        "defer",
        "premium_monthly",
        "sub-token",
        "--expiry",
        "2026-02-30T00:00:00Z",
      ]),
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_EXPIRY_INVALID", exitCode: 2 });
  });

  it("a dry run never prints the full purchase token", async () => {
    const token = "abcdefghij".repeat(10);
    await dryRun(["purchases", "subscription", "cancel-v2", token]);
    const out = logs.join("\n");
    expect(out).toContain("Would");
    expect(out).not.toContain(token);
  });
});
