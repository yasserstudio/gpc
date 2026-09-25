import type { PlayApiClient, ExternalTransaction, ExternalTransactionRefund } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export async function createExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  data: ExternalTransaction,
  externalTransactionId: string,
): Promise<ExternalTransaction> {
  return client.externalTransactions.create(packageName, data, externalTransactionId);
}

export async function getExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  transactionId: string,
): Promise<ExternalTransaction> {
  return client.externalTransactions.get(packageName, transactionId);
}

export async function refundExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  transactionId: string,
  refundData: ExternalTransactionRefund,
): Promise<ExternalTransaction> {
  return client.externalTransactions.refund(packageName, transactionId, refundData);
}

export interface ExternalTransactionRefundOptions {
  full?: boolean;
  /** Pre-tax amount in micros, e.g. "1990000" for 1.99. */
  partialAmount?: string;
  currency?: string;
  refundId?: string;
  /** When the refund happened; defaults to now. */
  refundTime?: string;
}

/** RFC 3339 with an explicit zone, so the same command means the same instant on every machine. */
const RFC3339_RE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i;
const MAX_INT64 = 2n ** 63n - 1n;
/** Leeway for clock skew before a refund time counts as in the future. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function refundUsageError(message: string, suggestion: string): GpcError {
  return new GpcError(message, "EXT_TXN_REFUND_INVALID", 2, suggestion);
}

/**
 * Build a refund request from CLI options. Google requires refundTime on every
 * refund and a unique refundId on each partial refund; a refund must name its
 * kind explicitly so a mistyped amount can never become a full refund.
 */
export function buildExternalTransactionRefund(
  options: ExternalTransactionRefundOptions,
  now: Date = new Date(),
): ExternalTransactionRefund {
  const partialAmount = options.partialAmount?.trim();
  const currency = options.currency?.trim();
  const refundId = options.refundId?.trim();

  if (options.full && partialAmount) {
    throw refundUsageError(
      "Use --full or --partial-amount, not both",
      "Pass --full to refund the whole transaction, or --partial-amount for part of it.",
    );
  }
  if (!options.full && !partialAmount) {
    throw refundUsageError(
      "Choose the refund type with --full or --partial-amount",
      "Pass --full, or --partial-amount <micros> --currency <code> --refund-id <id>.",
    );
  }

  let refundTime = now.toISOString();
  if (options.refundTime !== undefined) {
    const raw = options.refundTime.trim();
    const match = RFC3339_RE.exec(raw);
    const parsed = new Date(raw);
    // Date() quietly rolls 2026-02-30 over to March; round-trip the calendar date
    // in the given offset to catch that.
    const offsetMs = parsed.getTime() - Date.parse(raw.replace(/(?:Z|[+-]\d{2}:\d{2})$/i, "Z"));
    const calendarDate = match
      ? new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10)
      : undefined;
    if (!match || Number.isNaN(parsed.getTime()) || calendarDate !== match[1]) {
      throw refundUsageError(
        `Invalid --refund-time "${options.refundTime}"`,
        "Use an RFC 3339 timestamp with a timezone, for example 2026-09-25T12:00:00Z or 2026-09-25T14:00:00+02:00.",
      );
    }
    if (parsed.getTime() > now.getTime() + FUTURE_SKEW_MS) {
      throw refundUsageError(
        `--refund-time "${options.refundTime}" is in the future`,
        "Give the time the refund actually happened, or omit --refund-time to use now.",
      );
    }
    refundTime = parsed.toISOString();
  }

  if (options.full) {
    if (currency || refundId) {
      throw refundUsageError(
        "--currency and --refund-id only apply to --partial-amount",
        "Remove them for a full refund, or use --partial-amount instead of --full.",
      );
    }
    return { refundTime, fullRefund: {} };
  }

  if (
    !partialAmount ||
    !/^\d{1,19}$/.test(partialAmount) ||
    BigInt(partialAmount) <= 0n ||
    BigInt(partialAmount) > MAX_INT64
  ) {
    throw refundUsageError(
      `Invalid --partial-amount "${options.partialAmount}"`,
      "Give the pre-tax amount in micros as a positive whole number, for example 1990000 for 1.99.",
    );
  }
  if (!currency || !/^[A-Za-z]{3}$/.test(currency)) {
    throw refundUsageError(
      currency
        ? `Invalid --currency "${currency}"`
        : "--currency is required with --partial-amount",
      "Use the transaction's ISO 4217 currency code, for example USD.",
    );
  }
  if (!refundId) {
    throw refundUsageError(
      "--refund-id is required with --partial-amount",
      "Give each partial refund a unique ID; Google rejects a second refund with the same ID.",
    );
  }

  return {
    refundTime,
    partialRefund: {
      refundId,
      // Normalized, so "007" is sent as "7".
      refundPreTaxAmount: {
        priceMicros: BigInt(partialAmount).toString(),
        currency: currency.toUpperCase(),
      },
    },
  };
}
