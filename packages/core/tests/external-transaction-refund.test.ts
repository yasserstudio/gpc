import { describe, it, expect } from "vitest";
import { buildExternalTransactionRefund } from "../src/commands/external-transactions";
import { GpcError } from "../src/errors";

const NOW = new Date("2026-09-25T12:00:00Z");

function expectUsageError(fn: () => unknown, message: RegExp): void {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(GpcError);
    expect((err as GpcError).code).toBe("EXT_TXN_REFUND_INVALID");
    expect((err as GpcError).exitCode).toBe(2);
    expect((err as GpcError).message).toMatch(message);
    return;
  }
  throw new Error("expected a usage error");
}

describe("buildExternalTransactionRefund", () => {
  it("builds a full refund with Google's required refundTime", () => {
    expect(buildExternalTransactionRefund({ full: true }, NOW)).toEqual({
      refundTime: "2026-09-25T12:00:00.000Z",
      fullRefund: {},
    });
  });

  it("builds a partial refund with refundId, amount, currency and refundTime", () => {
    expect(
      buildExternalTransactionRefund(
        { partialAmount: "1990000", currency: "usd", refundId: "r-1" },
        NOW,
      ),
    ).toEqual({
      refundTime: "2026-09-25T12:00:00.000Z",
      partialRefund: {
        refundId: "r-1",
        refundPreTaxAmount: { priceMicros: "1990000", currency: "USD" },
      },
    });
  });

  it("uses --refund-time when given", () => {
    const refund = buildExternalTransactionRefund(
      { full: true, refundTime: "2026-09-20T08:30:00+02:00" },
      NOW,
    );
    expect(refund.refundTime).toBe("2026-09-20T06:30:00.000Z");
  });

  it.each([
    "2026-09-25T12:00:00", // no timezone: would depend on the machine's zone
    "2026-09-25 12:00Z",
    "2026-09-25",
    "2026-02-30T00:00:00Z", // Date() would roll this to March 2
    "2026",
    "1",
  ])("rejects --refund-time %s", (refundTime) => {
    expectUsageError(
      () => buildExternalTransactionRefund({ full: true, refundTime }, NOW),
      /--refund-time/,
    );
  });

  it("rejects a --refund-time in the future", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ full: true, refundTime: "2026-09-26T00:00:00Z" }, NOW),
      /in the future/,
    );
  });

  it("accepts a date that is valid in its own offset", () => {
    const refund = buildExternalTransactionRefund(
      { full: true, refundTime: " 2026-09-25T00:30:00+02:00 " },
      NOW,
    );
    expect(refund.refundTime).toBe("2026-09-24T22:30:00.000Z");
  });

  it("normalizes --partial-amount and bounds it to int64", () => {
    const refund = buildExternalTransactionRefund(
      { partialAmount: "007", currency: "USD", refundId: "r-1" },
      NOW,
    );
    expect(refund.partialRefund?.refundPreTaxAmount?.priceMicros).toBe("7");
    expectUsageError(
      () =>
        buildExternalTransactionRefund(
          { partialAmount: "99999999999999999999", currency: "USD", refundId: "r-1" },
          NOW,
        ),
      /--partial-amount/,
    );
  });

  it("rejects an unparseable --refund-time", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ full: true, refundTime: "yesterday" }, NOW),
      /--refund-time/,
    );
  });

  it("requires an explicit --full or --partial-amount", () => {
    expectUsageError(() => buildExternalTransactionRefund({}, NOW), /--full or --partial-amount/);
  });

  it("never turns a partial refund with a missing amount into a full refund", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ currency: "USD", refundId: "r-1" }, NOW),
      /--full or --partial-amount/,
    );
    expectUsageError(
      () =>
        buildExternalTransactionRefund(
          { partialAmount: " ", currency: "USD", refundId: "r-1" },
          NOW,
        ),
      /--full or --partial-amount/,
    );
  });

  it("rejects --full together with --partial-amount", () => {
    expectUsageError(
      () =>
        buildExternalTransactionRefund(
          { full: true, partialAmount: "100", currency: "USD", refundId: "r-1" },
          NOW,
        ),
      /not both/,
    );
  });

  it("rejects --currency or --refund-id on a full refund", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ full: true, currency: "USD" }, NOW),
      /only apply to --partial-amount/,
    );
    expectUsageError(
      () => buildExternalTransactionRefund({ full: true, refundId: "r-1" }, NOW),
      /only apply to --partial-amount/,
    );
  });

  it.each(["0", "-5", "1.5", "1e6", "0x10", "abc"])("rejects --partial-amount %s", (amount) => {
    expectUsageError(
      () =>
        buildExternalTransactionRefund(
          { partialAmount: amount, currency: "USD", refundId: "r-1" },
          NOW,
        ),
      /--partial-amount/,
    );
  });

  it("requires a 3-letter --currency for a partial refund", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ partialAmount: "100", refundId: "r-1" }, NOW),
      /--currency/,
    );
    expectUsageError(
      () =>
        buildExternalTransactionRefund(
          { partialAmount: "100", currency: "dollars", refundId: "r-1" },
          NOW,
        ),
      /--currency/,
    );
  });

  it("requires --refund-id for a partial refund", () => {
    expectUsageError(
      () => buildExternalTransactionRefund({ partialAmount: "100", currency: "USD" }, NOW),
      /--refund-id/,
    );
  });
});
