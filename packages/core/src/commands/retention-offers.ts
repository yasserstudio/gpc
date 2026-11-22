import type { BasePlan, SubscriptionOffer } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { parseRfc3339 } from "../utils/rfc3339.js";

// Rules from developer.android.com/google/play/billing/retention-offers (Play
// Developer API rev 20261119). Checked locally so a bad offer fails with every
// problem listed, before any API call.

export interface RetentionViolation {
  /** JSON path of the offending field, e.g. `targeting.retentionRule.minDuration`. */
  field: string;
  message: string;
  suggestion: string;
}

export interface ValidateRetentionOptions {
  /** The offer's base plan, when already known: enables the auto-renewing and billing-period checks. */
  basePlan?: BasePlan;
  now?: Date;
  /**
   * A create sends the whole offer, so fields Google requires must be present:
   * phases, offer-level regionalConfigs and a discount. An update may be partial.
   */
  requireComplete?: boolean;
}

const TARGETING_RULES = [
  "acquisitionRule",
  "upgradeRule",
  "retentionRule",
  "retentionPerUserRule",
] as const;
const DAYS_RE = /^P(\d{1,4})D$/;
const MAX_DAYS = 1826;
const MAX_RECURRENCE = 52;
const FORBIDDEN_REGIONAL = ["price", "absoluteDiscount", "free"] as const;
const FORBIDDEN_OTHER_REGIONS = ["otherRegionsPrices", "absoluteDiscounts", "free"] as const;

/** True when the payload targets a retention rule (cohort or per-user). */
export function isRetentionOffer(offer: SubscriptionOffer): boolean {
  const t = offer.targeting;
  return t?.retentionRule !== undefined || t?.retentionPerUserRule !== undefined;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEmptyObject(v: unknown): boolean {
  return isPlainObject(v) && Object.keys(v).length === 0;
}

function isFraction(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1;
}

/** Days in a `P<n>D` duration, or undefined for any other shape. */
function parseDays(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined;
  const m = DAYS_RE.exec(v);
  return m ? Number(m[1]) : undefined;
}

/**
 * Check a retention offer against Google's rules. Returns every violation, not
 * just the first; an empty array means the offer passes. Fields absent from the
 * payload (a partial update) are not checked, except where Google requires them.
 */
export function validateRetentionOffer(
  offer: SubscriptionOffer,
  options: ValidateRetentionOptions = {},
): RetentionViolation[] {
  const now = options.now ?? new Date();
  const out: RetentionViolation[] = [];
  const add = (field: string, message: string, suggestion: string) =>
    out.push({ field, message, suggestion });

  const targeting = (offer.targeting ?? {}) as Record<string, unknown>;
  const rules = TARGETING_RULES.filter((k) => targeting[k] !== undefined);
  if (rules.length > 1) {
    add(
      "targeting",
      `targeting sets ${rules.join(" and ")}; an offer takes exactly one rule`,
      "Keep only retentionRule (every eligible subscriber) or retentionPerUserRule (subscribers you target).",
    );
  }

  const cohort = targeting["retentionRule"];
  if (cohort !== undefined) {
    const base = "targeting.retentionRule";
    if (!isPlainObject(cohort)) {
      add(
        base,
        "retentionRule must be an object",
        'Use { "scope": { "thisSubscription": {} }, "minDuration": "P0D" }.',
      );
    } else {
      const scope = cohort["scope"];
      if (
        !isPlainObject(scope) ||
        Object.keys(scope).length !== 1 ||
        !isEmptyObject(scope["thisSubscription"])
      ) {
        add(
          `${base}.scope`,
          "scope must be { thisSubscription: {} } for a retention offer",
          'Set "scope": { "thisSubscription": {} }.',
        );
      }

      const minDays = parseDays(cohort["minDuration"]);
      if (cohort["minDuration"] === undefined) {
        add(
          `${base}.minDuration`,
          "minDuration is required",
          'Set the minimum paid time in days, e.g. "P90D", or "P0D" for none.',
        );
      } else if (minDays === undefined || minDays > MAX_DAYS) {
        add(
          `${base}.minDuration`,
          `minDuration "${String(cohort["minDuration"])}" must be P<n>D with n from 0 to ${MAX_DAYS}`,
          'Write days only, e.g. "P90D". Months such as "P3M" are rejected by Google.',
        );
      }

      const multiple = cohort["allowMultipleClaims"];
      if (multiple !== undefined && typeof multiple !== "boolean") {
        add(
          `${base}.allowMultipleClaims`,
          "allowMultipleClaims must be true or false",
          "Use true or false, or leave it out (defaults to false).",
        );
      }
      const cooldown = cohort["minOfferCooldownDuration"];
      if (multiple === true) {
        const days = parseDays(cooldown);
        if (cooldown === undefined) {
          add(
            `${base}.minOfferCooldownDuration`,
            "minOfferCooldownDuration is required when allowMultipleClaims is true",
            'Set the wait before a subscriber can claim again, e.g. "P180D".',
          );
        } else if (days === undefined || days < 1 || days > MAX_DAYS) {
          add(
            `${base}.minOfferCooldownDuration`,
            `minOfferCooldownDuration "${String(cooldown)}" must be P<n>D with n from 1 to ${MAX_DAYS}`,
            'Write days only, e.g. "P180D".',
          );
        }
      } else if (cooldown !== undefined) {
        add(
          `${base}.minOfferCooldownDuration`,
          "minOfferCooldownDuration is only allowed when allowMultipleClaims is true",
          "Remove minOfferCooldownDuration, or set allowMultipleClaims to true.",
        );
      }
    }
  }

  const perUser = targeting["retentionPerUserRule"];
  if (perUser !== undefined && !isEmptyObject(perUser)) {
    add(
      "targeting.retentionPerUserRule",
      "retentionPerUserRule takes no fields",
      'Set "retentionPerUserRule": {}.',
    );
  }

  if (offer.phases === undefined && options.requireComplete) {
    add(
      "phases",
      "phases is required when creating a retention offer",
      "Add one phase with a relativeDiscount, or start from `gpc subscriptions offers template retention`.",
    );
  }
  if (options.requireComplete) {
    const regions = offer.regionalConfigs;
    if (!Array.isArray(regions) || regions.length === 0) {
      add(
        "regionalConfigs",
        "Google requires at least one offer-level regionalConfigs entry",
        'Add e.g. "regionalConfigs": [{ "regionCode": "US", "newSubscriberAvailability": true }] covering every region priced in the phase.',
      );
    }
  }

  if (offer.phases !== undefined) {
    if (!Array.isArray(offer.phases) || offer.phases.length !== 1) {
      const n = Array.isArray(offer.phases) ? offer.phases.length : 0;
      add(
        "phases",
        `a retention offer has exactly one phase (got ${n})`,
        "Keep a single discounted phase.",
      );
    }
    const phase: unknown = Array.isArray(offer.phases) ? offer.phases[0] : undefined;
    if (Array.isArray(offer.phases) && offer.phases.length > 0 && !isPlainObject(phase)) {
      add("phases[0]", "the phase must be an object", "Replace it with a phase object.");
    }
    if (isPlainObject(phase)) {
      const count = phase["recurrenceCount"] as number;
      if (!Number.isInteger(count) || count < 1 || count > MAX_RECURRENCE) {
        add(
          "phases[0].recurrenceCount",
          `recurrenceCount must be a whole number from 1 to ${MAX_RECURRENCE}`,
          "Set how many billing periods the discount lasts, e.g. 2.",
        );
      }
      const period = options.basePlan?.autoRenewingBasePlanType?.billingPeriodDuration;
      if (count > 1 && period && phase["duration"] !== period) {
        add(
          "phases[0].duration",
          `duration "${String(phase["duration"])}" must equal the base plan billing period "${period}" when recurrenceCount is above 1`,
          `Set "duration": "${period}".`,
        );
      }
      const regionalConfigs = Array.isArray(phase["regionalConfigs"])
        ? phase["regionalConfigs"]
        : [];
      regionalConfigs.forEach((rec: unknown, i) => {
        const field = `phases[0].regionalConfigs[${i}]`;
        if (!isPlainObject(rec)) {
          add(
            field,
            "each regional config must be an object",
            'Use { "regionCode": "US", "relativeDiscount": 0.5 }.',
          );
          return;
        }
        const banned = FORBIDDEN_REGIONAL.filter((k) => rec[k] !== undefined);
        if (banned.length > 0) {
          add(
            field,
            `${String(rec["regionCode"] ?? "region")} uses ${banned.join(", ")}; retention offers support only relativeDiscount`,
            "Replace it with relativeDiscount, e.g. 0.5 for 50% off.",
          );
        }
        if (!isFraction(rec["relativeDiscount"])) {
          add(
            `${field}.relativeDiscount`,
            "relativeDiscount must be a number greater than 0 and less than 1",
            "Use a fraction, e.g. 0.5 for 50% off.",
          );
        }
      });
      const otherRaw = phase["otherRegionsConfig"];
      const other = isPlainObject(otherRaw) ? otherRaw : undefined;
      if (other) {
        const banned = FORBIDDEN_OTHER_REGIONS.filter((k) => other[k] !== undefined);
        if (banned.length > 0) {
          add(
            "phases[0].otherRegionsConfig",
            `otherRegionsConfig uses ${banned.join(", ")}; retention offers support only relativeDiscount`,
            "Replace it with relativeDiscount.",
          );
        }
        if (other["relativeDiscount"] !== undefined && !isFraction(other["relativeDiscount"])) {
          add(
            "phases[0].otherRegionsConfig.relativeDiscount",
            "relativeDiscount must be a number greater than 0 and less than 1",
            "Use a fraction, e.g. 0.5 for 50% off.",
          );
        }
      }
      // A region without relativeDiscount is already reported above; this catches a
      // phase with no region at all to carry the discount.
      const hasDiscount = regionalConfigs.length > 0 || other?.["relativeDiscount"] !== undefined;
      if (options.requireComplete && !hasDiscount) {
        add(
          "phases[0]",
          "the phase sets no relativeDiscount in any region",
          "Add regionalConfigs with relativeDiscount, or otherRegionsConfig.relativeDiscount.",
        );
      }
    }
  }

  const asTime = (v: unknown) => (typeof v === "string" ? parseRfc3339(v) : undefined);
  const start = offer.startTime !== undefined ? asTime(offer.startTime) : undefined;
  if (offer.startTime !== undefined && !start) {
    add(
      "startTime",
      `startTime "${String(offer.startTime)}" is not an RFC 3339 timestamp with a timezone`,
      "Use e.g. 2026-12-01T00:00:00Z.",
    );
  }
  if (offer.endTime !== undefined) {
    const end = asTime(offer.endTime);
    if (!end) {
      add(
        "endTime",
        `endTime "${String(offer.endTime)}" is not an RFC 3339 timestamp with a timezone`,
        "Use e.g. 2027-03-01T00:00:00Z.",
      );
    } else if (end.getTime() <= now.getTime()) {
      add(
        "endTime",
        `endTime "${offer.endTime}" is not in the future`,
        "Pick a later endTime, or leave it out for no end date.",
      );
    } else if (start && end.getTime() <= start.getTime()) {
      add("endTime", "endTime must be later than startTime", "Move endTime after startTime.");
    }
  }

  const bp = options.basePlan;
  if (bp && !bp.autoRenewingBasePlanType) {
    const kind = bp.installmentsBasePlanType
      ? "installments"
      : bp.prepaidBasePlanType
        ? "prepaid"
        : "non auto-renewing";
    add(
      "basePlanId",
      `base plan "${bp.basePlanId}" is ${kind}; retention offers need an auto-renewing base plan`,
      "Add the offer to an auto-renewing base plan.",
    );
  }

  return out;
}

/** Throw one usage error (exit 2) listing every violation, if there are any. */
export function assertValidRetentionOffer(
  offer: SubscriptionOffer,
  options: ValidateRetentionOptions = {},
): void {
  const violations = validateRetentionOffer(offer, options);
  if (violations.length === 0) return;
  const lines = violations.map((v) => `  - ${v.field}: ${v.message}. Fix: ${v.suggestion}`);
  throw new GpcError(
    `Retention offer "${offer.offerId}" has ${violations.length} problem${violations.length === 1 ? "" : "s"}:\n${lines.join("\n")}`,
    "RETENTION_OFFER_INVALID",
    2,
    "Fix each listed field and retry. Rules: https://developer.android.com/google/play/billing/retention-offers",
  );
}

/**
 * Starter JSON for `offers create --file`, built from the two samples in
 * Google's retention offers guide plus one phase that follows its rules. No
 * startTime/endTime: they are optional and a fixed date would go stale.
 */
export function retentionOfferTemplate(perUser = false): SubscriptionOffer {
  // Google requires offer-level regions; each region priced in the phase must be listed here.
  const regionalConfigs = [{ regionCode: "US", newSubscriberAvailability: true }];
  const phases: SubscriptionOffer["phases"] = [
    {
      recurrenceCount: perUser ? 1 : 2,
      duration: "P1M",
      regionalConfigs: [{ regionCode: "US", relativeDiscount: perUser ? 0.3 : 0.5 }],
      otherRegionsConfig: { relativeDiscount: perUser ? 0.3 : 0.5 },
    },
  ];
  if (perUser) {
    return {
      offerId: "retention-peruser-30off",
      targeting: { retentionPerUserRule: {} },
      phases,
      regionalConfigs,
    } as SubscriptionOffer;
  }
  return {
    offerId: "retention-50off-2m",
    targeting: {
      retentionRule: {
        scope: { thisSubscription: {} },
        minDuration: "P90D",
        allowMultipleClaims: true,
        minOfferCooldownDuration: "P180D",
      },
    },
    phases,
    regionalConfigs,
  } as SubscriptionOffer;
}
