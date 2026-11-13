// Named exports only. No default export.

import type { FindingSeverity, ParsedManifest, PreflightFinding } from "./types.js";

/**
 * Google Play Billing Library support timeline, keyed by major version: the
 * update deadline (after it, new apps and updates need an extension) and the
 * extension deadline (after it, no exceptions). ISO calendar days, compared in
 * UTC. Source: https://developer.android.com/google/play/billing/deprecation-faq
 * This is the one place to edit when Google adds a version or moves a date.
 */
export const BILLING_LIBRARY_DEADLINES: Readonly<
  Record<number, { updateDeadline: string; extensionDeadline: string }>
> = {
  5: { updateDeadline: "2024-08-31", extensionDeadline: "2024-11-01" },
  6: { updateDeadline: "2025-08-31", extensionDeadline: "2025-11-01" },
  7: { updateDeadline: "2026-08-31", extensionDeadline: "2026-11-01" },
  8: { updateDeadline: "2027-08-31", extensionDeadline: "2027-11-01" },
  9: { updateDeadline: "2028-08-31", extensionDeadline: "2028-11-01" },
};

const BILLING_PERMISSION = "com.android.vending.BILLING";
const VERSION_META_DATA = "com.google.android.play.billingclient.version";
const DEPRECATION_FAQ = "https://developer.android.com/google/play/billing/deprecation-faq";
const RELEASE_NOTES = "https://developer.android.com/google/play/billing/release-notes";
const MIGRATION_GUIDES: Readonly<Record<number, string>> = {
  8: "https://developer.android.com/google/play/billing/migrate-gpblv8",
  9: "https://developer.android.com/google/play/billing/migrate-gpblv9",
};

const KNOWN_MAJORS = Object.keys(BILLING_LIBRARY_DEADLINES)
  .map(Number)
  .sort((a, b) => a - b);
const OLDEST_KNOWN = KNOWN_MAJORS[0] ?? 0;
const NEWEST_KNOWN = KNOWN_MAJORS[KNOWN_MAJORS.length - 1] ?? 0;

const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC midnight starting `isoDay`, shifted by whole years/days. Throws on a malformed table entry. */
function utcDayStart(isoDay: string, { years = 0, days = 0 } = {}): number {
  const match = ISO_DAY_RE.exec(isoDay);
  if (!match) throw new Error(`Invalid Billing Library deadline "${isoDay}" (expected YYYY-MM-DD)`);
  return Date.UTC(Number(match[1]) + years, Number(match[2]) - 1, Number(match[3]) + days);
}

/**
 * The table as millisecond boundaries, computed once at load so a typo fails
 * loudly instead of turning every comparison false. A deadline day is not yet
 * past, so "past" starts at the next UTC midnight.
 */
const BOUNDARIES: ReadonlyMap<
  number,
  { infoFrom: number; updatePastFrom: number; extensionPastFrom: number }
> = new Map(
  Object.entries(BILLING_LIBRARY_DEADLINES).map(([key, { updateDeadline, extensionDeadline }]) => {
    const major = Number(key);
    return [
      major,
      {
        infoFrom: utcDayStart(updateDeadline, { years: -1 }),
        updatePastFrom: utcDayStart(updateDeadline, { days: 1 }),
        extensionPastFrom: utcDayStart(extensionDeadline, { days: 1 }),
      },
    ];
  }),
);

/** Where a Billing Library major stands on a given day. */
type BillingLibraryStatus =
  | "older-than-table"
  | "past-extension-deadline"
  | "past-update-deadline"
  | "update-deadline-within-a-year";

const STATUS_SEVERITY: Readonly<Record<BillingLibraryStatus, FindingSeverity>> = {
  "older-than-table": "error",
  "past-extension-deadline": "error",
  "past-update-deadline": "warning",
  "update-deadline-within-a-year": "info",
};

function billingLibraryStatus(major: number, now: Date): BillingLibraryStatus | undefined {
  if (major < OLDEST_KNOWN) return "older-than-table";
  const bounds = BOUNDARIES.get(major);
  if (!bounds) return undefined;
  const t = now.getTime();
  if (t >= bounds.extensionPastFrom) return "past-extension-deadline";
  if (t >= bounds.updatePastFrom) return "past-update-deadline";
  if (t >= bounds.infoFrom) return "update-deadline-within-a-year";
  return undefined;
}

/**
 * Severity of shipping Billing Library `major` on `now`, or undefined for no finding.
 * Majors older than the table are past both deadlines; newer ones are not flagged.
 */
export function billingLibrarySeverity(major: number, now: Date): FindingSeverity | undefined {
  const status = billingLibraryStatus(major, now);
  return status && STATUS_SEVERITY[status];
}

/** The oldest major newer than `major` whose update deadline has not passed. */
function targetMajor(major: number, now: Date): number {
  const next = KNOWN_MAJORS.find((m) => {
    const bounds = BOUNDARIES.get(m);
    return m > major && bounds !== undefined && now.getTime() < bounds.updatePastFrom;
  });
  return next ?? NEWEST_KNOWN + 1;
}

function migrationAdvice(target: number): string {
  const guide = MIGRATION_GUIDES[target];
  return guide
    ? `Move to Billing Library ${target} or later. Migration guide: ${guide}`
    : `Move to Billing Library ${target} or later. Release notes: ${RELEASE_NOTES}`;
}

/** Findings for the Billing Library version recorded in an AAB's merged manifest. */
export function billingLibraryFindings(manifest: ParsedManifest, now: Date): PreflightFinding[] {
  if (!manifest.permissions.includes(BILLING_PERMISSION)) return [];

  const version = manifest.metaData[VERSION_META_DATA];
  const majorMatch = version?.trim().match(/^\d+/);
  if (!version || !majorMatch) {
    const found = version ? `has an unreadable value ("${version}")` : "is missing";
    return [
      {
        scanner: "policy",
        ruleId: "billing-library-version-unknown",
        severity: "info",
        title: "Google Play Billing Library version could not be determined",
        message: `This bundle requests ${BILLING_PERMISSION}, but the ${VERSION_META_DATA} manifest entry ${found}. Manifest merging can remove it (for example a tools:node="remove" override), so preflight cannot compare the Billing Library version with Google Play's deadlines.`,
        suggestion: `Check the Billing Library version in your Gradle dependencies against Google's support timeline: ${DEPRECATION_FAQ}`,
        policyUrl: DEPRECATION_FAQ,
      },
    ];
  }

  const major = Number(majorMatch[0]);
  const status = billingLibraryStatus(major, now);
  if (!status) return [];

  const shipsVersion = `This bundle ships Google Play Billing Library ${version}.`;
  const advice = migrationAdvice(targetMajor(major, now));
  let title: string;
  let message: string;
  let suggestion = advice;

  if (status === "older-than-table") {
    const oldest = BILLING_LIBRARY_DEADLINES[OLDEST_KNOWN];
    title = `Google Play Billing Library ${major} is no longer supported`;
    message = `${shipsVersion} It is older than Billing Library ${OLDEST_KNOWN}, whose extension deadline passed on ${oldest?.extensionDeadline ?? "an earlier date"}. Google Play no longer accepts new apps or app updates built on it.`;
  } else {
    // Any other status comes from a table entry, so this guard never fires.
    const deadlines = BILLING_LIBRARY_DEADLINES[major];
    if (!deadlines) return [];
    if (status === "past-extension-deadline") {
      title = `Google Play Billing Library ${major} is no longer supported`;
      message = `${shipsVersion} Its extension deadline passed on ${deadlines.extensionDeadline}, so Google Play no longer accepts new apps or app updates built on Billing Library ${major}.`;
    } else if (status === "past-update-deadline") {
      title = `Google Play Billing Library ${major} is past its update deadline`;
      message = `${shipsVersion} Its update deadline passed on ${deadlines.updateDeadline}. Until ${deadlines.extensionDeadline}, Google Play accepts new apps and app updates on Billing Library ${major} only if the app was granted an extension. After that date it accepts none.`;
      suggestion = `To keep shipping while you migrate, request an extension from the warning on Play Console's Policy status page. ${advice}`;
    } else {
      title = `Google Play Billing Library ${major} update deadline is ${deadlines.updateDeadline}`;
      message = `${shipsVersion} After ${deadlines.updateDeadline}, Google Play accepts new apps and app updates on Billing Library ${major} only with an extension, and after ${deadlines.extensionDeadline} not at all.`;
    }
  }

  return [
    {
      scanner: "policy",
      ruleId: "billing-library-deprecated",
      severity: STATUS_SEVERITY[status],
      title,
      message,
      suggestion,
      policyUrl: DEPRECATION_FAQ,
    },
  ];
}
