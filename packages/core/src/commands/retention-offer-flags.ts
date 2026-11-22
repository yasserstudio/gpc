import type { BasePlan, PlayApiClient, SubscriptionOffer } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { parseRfc3339 } from "../utils/rfc3339.js";
import { validatePackageName, validateSku } from "../utils/validation.js";
import { assertValidRetentionOffer } from "./retention-offers.js";

// Builds a retention offer from command-line flags instead of a JSON file. The
// base plan supplies what a user would otherwise copy by hand: its billing
// period and the regions it is sold in. The result goes through the same
// retention validator as a file.

export type RetentionKind = "cohort" | "per-user";

/** Raw flag values, as typed on the command line. */
export interface RetentionFlagInput {
  kind: RetentionKind;
  offerId: string;
  discount: string;
  /** Billing periods the discount lasts. Default 1. */
  periods?: string;
  minDuration?: string;
  multipleClaims?: boolean;
  cooldown?: string;
  /** Comma-separated region codes. Default: every region of the base plan. */
  regions?: string;
  start?: string;
  end?: string;
}

/** Flag values after parsing: durations as P<n>D, discount as a number. */
export interface RetentionFlags {
  kind: RetentionKind;
  offerId: string;
  discount: number;
  periods: number;
  minDuration?: string;
  multipleClaims?: boolean;
  cooldown?: string;
  regions?: string[];
  start?: string;
  end?: string;
}

/** Flags `offers update` accepts on a retention offer. */
export interface RetentionUpdateInput {
  start?: string;
  end?: string;
  minDuration?: string;
  multipleClaims?: boolean;
  cooldown?: string;
}

function flagError(message: string, suggestion: string): GpcError {
  return new GpcError(message, "RETENTION_FLAG_INVALID", 2, suggestion);
}

const DAYS_FLAG_RE = /^(?:(\d+)d|P(\d+)D)$/i;

/** `90d` or `P90D` to `P90D`. Months and weeks are refused: Google takes days only. */
function parseDaysFlag(flag: string, raw: string): string {
  const m = DAYS_FLAG_RE.exec(raw.trim());
  if (!m) {
    throw flagError(
      `${flag} "${raw}" is not a number of days.`,
      `Give the duration in days, for example ${flag} 90d or ${flag} P90D. Google does not accept months.`,
    );
  }
  return `P${Number(m[1] ?? m[2])}D`;
}

const FRACTION_RE = /^(?:0?\.\d+|0)$/;
const PERCENT_RE = /^(\d+(?:\.\d+)?)%?$/;

/** A fraction between 0 and 1. `50` and `50%` are refused with the fraction they meant. */
function parseDiscount(raw: string): number {
  const value = raw.trim();
  if (FRACTION_RE.test(value)) {
    const n = Number(value);
    if (n > 0 && n < 1) return n;
  }
  const pct = PERCENT_RE.exec(value);
  const asPercent = pct ? Number(pct[1]) : NaN;
  if (asPercent > 1 && asPercent < 100) {
    const fraction = Number((asPercent / 100).toFixed(6));
    throw flagError(
      `--discount "${raw}" looks like a percentage. GPC expects a fraction.`,
      `Use --discount ${fraction} for ${asPercent}% off.`,
    );
  }
  throw flagError(
    `--discount "${raw}" must be a number greater than 0 and less than 1.`,
    "Use a fraction, for example --discount 0.5 for 50% off.",
  );
}

function parseTimeFlag(flag: string, raw: string): string {
  if (!parseRfc3339(raw)) {
    throw flagError(
      `${flag} "${raw}" is not an RFC 3339 timestamp with a time zone.`,
      `Use a full timestamp, for example ${flag} 2027-03-01T00:00:00Z.`,
    );
  }
  return raw.trim();
}

function parsePeriods(raw: string): number {
  if (!/^\d+$/.test(raw.trim())) {
    throw flagError(
      `--periods "${raw}" must be a whole number.`,
      "Set how many billing periods the discount lasts, for example --periods 2.",
    );
  }
  return Number(raw.trim());
}

/** Parse targeting and time flags shared by create and update. */
function parseShared(input: RetentionUpdateInput): RetentionUpdateInput {
  const out: RetentionUpdateInput = {};
  if (input.minDuration !== undefined)
    out.minDuration = parseDaysFlag("--min-duration", input.minDuration);
  if (input.multipleClaims !== undefined) out.multipleClaims = input.multipleClaims;
  if (input.cooldown !== undefined) out.cooldown = parseDaysFlag("--cooldown", input.cooldown);
  if (input.start !== undefined) out.start = parseTimeFlag("--start", input.start);
  if (input.end !== undefined) out.end = parseTimeFlag("--end", input.end);
  return out;
}

const COHORT_ONLY: [keyof RetentionUpdateInput, string][] = [
  ["minDuration", "--min-duration"],
  ["multipleClaims", "--multiple-claims"],
  ["cooldown", "--cooldown"],
];

/** Check and normalize raw flags. Throws RETENTION_FLAG_INVALID (exit 2) on the first bad flag. */
export function parseRetentionFlags(input: RetentionFlagInput): RetentionFlags {
  if (input.kind === "per-user") {
    const used = COHORT_ONLY.find(([key]) => input[key] !== undefined);
    if (used) {
      throw flagError(
        `${used[1]} applies only to --retention cohort.`,
        `Remove ${used[1]}, or use --retention cohort.`,
      );
    }
  }
  const shared = parseShared(input);
  const flags: RetentionFlags = {
    kind: input.kind,
    offerId: input.offerId,
    discount: parseDiscount(input.discount),
    periods: input.periods === undefined ? 1 : parsePeriods(input.periods),
    ...shared,
  };
  if (input.regions !== undefined) {
    const codes = input.regions
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    if (codes.length === 0) {
      throw flagError(
        "--regions is empty.",
        "List region codes separated by commas, for example --regions US,GB.",
      );
    }
    flags.regions = [...new Set(codes)];
  }
  return flags;
}

function retentionTargeting(flags: RetentionUpdateInput & { kind: RetentionKind }) {
  if (flags.kind === "per-user") return { retentionPerUserRule: {} };
  return {
    retentionRule: {
      scope: { thisSubscription: {} },
      minDuration: flags.minDuration ?? "P0D",
      ...(flags.multipleClaims !== undefined && { allowMultipleClaims: flags.multipleClaims }),
      ...(flags.cooldown !== undefined && { minOfferCooldownDuration: flags.cooldown }),
    },
  };
}

/**
 * Build a retention offer for a base plan from parsed flags. The phase lasts
 * `periods` billing periods of the base plan. Regions default to every region
 * of the base plan, plus other regions when the base plan sells there.
 * Throws RETENTION_OFFER_INVALID when the result breaks Google's rules.
 */
export function buildRetentionOffer(
  productId: string,
  basePlan: BasePlan,
  flags: RetentionFlags,
  options: { now?: Date } = {},
): SubscriptionOffer {
  const sold = (basePlan.regionalConfigs ?? []).map((r) => r.regionCode);
  let regions = sold;
  if (flags.regions) {
    const missing = flags.regions.filter((r) => !sold.includes(r));
    if (missing.length > 0) {
      throw flagError(
        `Base plan "${basePlan.basePlanId}" is not sold in ${missing.join(", ")}.`,
        `Use regions the base plan is sold in: ${sold.join(", ") || "none"}.`,
      );
    }
    regions = flags.regions;
  }
  const withOtherRegions = !flags.regions && basePlan.otherRegionsConfig !== undefined;

  const period =
    basePlan.autoRenewingBasePlanType?.billingPeriodDuration ??
    basePlan.prepaidBasePlanType?.billingPeriodDuration ??
    basePlan.installmentsBasePlanType?.billingPeriodDuration ??
    "P1M";

  const offer: SubscriptionOffer = {
    productId,
    basePlanId: basePlan.basePlanId,
    offerId: flags.offerId,
    targeting: retentionTargeting(flags),
    phases: [
      {
        recurrenceCount: flags.periods,
        duration: period,
        regionalConfigs: regions.map((regionCode) => ({
          regionCode,
          relativeDiscount: flags.discount,
        })),
        ...(withOtherRegions && { otherRegionsConfig: { relativeDiscount: flags.discount } }),
      },
    ],
    regionalConfigs: regions.map((regionCode) => ({ regionCode, newSubscriberAvailability: true })),
    ...(withOtherRegions && {
      otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
    }),
    ...(flags.start !== undefined && { startTime: flags.start }),
    ...(flags.end !== undefined && { endTime: flags.end }),
  } as SubscriptionOffer;

  assertValidRetentionOffer(offer, { basePlan, now: options.now, requireComplete: true });
  return offer;
}

/**
 * Parse the flags, read the base plan from Google Play, and build the offer.
 * Bad flags fail before any API call.
 */
export async function prepareRetentionOffer(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  input: RetentionFlagInput,
  options: { now?: Date } = {},
): Promise<SubscriptionOffer> {
  validatePackageName(packageName);
  validateSku(productId);
  const flags = parseRetentionFlags(input);
  const basePlan = await findBasePlan(client, packageName, productId, basePlanId);
  return buildRetentionOffer(productId, basePlan, flags, options);
}

/** Read a subscription and return one of its base plans, or fail with exit 2. */
export async function findBasePlan(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
): Promise<BasePlan> {
  const subscription = await client.subscriptions.get(packageName, productId);
  const basePlan = subscription.basePlans?.find((b) => b.basePlanId === basePlanId);
  if (basePlan) return basePlan;
  const known = (subscription.basePlans ?? []).map((b) => b.basePlanId);
  throw new GpcError(
    `Subscription "${productId}" has no base plan "${basePlanId}".`,
    "BASE_PLAN_NOT_FOUND",
    2,
    known.length > 0
      ? `Use one of its base plans: ${known.join(", ")}.`
      : `Add a base plan first. To see the subscription, run gpc subscriptions get ${productId}.`,
  );
}

/**
 * Check `offers update` flags without calling the API, so a typo exits 2
 * before credentials are needed. Returns the normalized values.
 */
export function parseRetentionUpdateFlags(input: RetentionUpdateInput): RetentionUpdateInput {
  const flags = parseShared(input);
  if (Object.keys(flags).length === 0) {
    throw flagError(
      "Nothing to update.",
      "Give --file, or at least one of --start, --end, --min-duration, --multiple-claims, --cooldown.",
    );
  }
  return flags;
}

/** The start and end an update leaves on the offer must still make sense. */
function checkUpdatedTimes(current: SubscriptionOffer, flags: RetentionUpdateInput, now: Date) {
  const start = flags.start ?? current.startTime;
  const end = flags.end ?? current.endTime;
  const endDate = end ? parseRfc3339(end) : undefined;
  const startDate = start ? parseRfc3339(start) : undefined;
  if (flags.end !== undefined && endDate && endDate.getTime() <= now.getTime()) {
    throw flagError(
      `--end ${flags.end} is in the past.`,
      "Use a time in the future, for example --end 2027-03-01T00:00:00Z.",
    );
  }
  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    throw flagError(
      `The offer would end (${end}) before it starts (${start}).`,
      "Set --end after the start time, or change --start.",
    );
  }
}

/**
 * Turn `offers update` flags into a partial offer and its update mask. The
 * offer is read once: targeting flags are merged into its current retention
 * rule, so a flag changes one field and keeps the others, and new start or end
 * times are checked against the ones already stored.
 */
export async function prepareRetentionOfferUpdate(
  client: PlayApiClient,
  packageName: string,
  productId: string,
  basePlanId: string,
  offerId: string,
  input: RetentionUpdateInput,
  options: { now?: Date } = {},
): Promise<{ offer: SubscriptionOffer; updateMask: string }> {
  validatePackageName(packageName);
  validateSku(productId);
  const flags = parseRetentionUpdateFlags(input);
  const current = await client.subscriptions.getOffer(packageName, productId, basePlanId, offerId);
  const offer = { productId, basePlanId, offerId } as SubscriptionOffer;
  const mask: string[] = [];

  if (COHORT_ONLY.some(([key]) => flags[key] !== undefined)) {
    const rule = current.targeting?.retentionRule as Record<string, unknown> | undefined;
    if (!rule) {
      throw flagError(
        `Offer "${offerId}" is not a cohort retention offer, so --min-duration, --multiple-claims and --cooldown do not apply.`,
        "Edit its targeting with --file instead.",
      );
    }
    const merged: Record<string, unknown> = { ...rule };
    if (flags.minDuration !== undefined) merged["minDuration"] = flags.minDuration;
    if (flags.multipleClaims !== undefined) merged["allowMultipleClaims"] = flags.multipleClaims;
    if (flags.multipleClaims === false) delete merged["minOfferCooldownDuration"];
    if (flags.cooldown !== undefined) merged["minOfferCooldownDuration"] = flags.cooldown;
    offer.targeting = { retentionRule: merged } as SubscriptionOffer["targeting"];
    mask.push("targeting");
  }
  if (flags.start !== undefined || flags.end !== undefined) {
    checkUpdatedTimes(current, flags, options.now ?? new Date());
  }
  if (flags.start !== undefined) {
    offer.startTime = flags.start;
    mask.push("startTime");
  }
  if (flags.end !== undefined) {
    offer.endTime = flags.end;
    mask.push("endTime");
  }
  return { offer, updateMask: mask.join(",") };
}
