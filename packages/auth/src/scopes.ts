import { createHash } from "node:crypto";

export const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
export const REPORTING_SCOPE = "https://www.googleapis.com/auth/playdeveloperreporting";
// Read-only GCS access for downloading Play bulk reports (financial/stats CSVs live in the
// Play-linked pubsite_prod_<developerId> bucket). Deliberately NOT part of DEFAULT_SCOPES:
// only the reports path requests it, so a leaked or cached token from any other command
// never carries storage access (least privilege). The account must additionally be granted
// "download bulk reports" in Play Console for the bucket read itself to succeed.
export const STORAGE_READ_ONLY_SCOPE = "https://www.googleapis.com/auth/devstorage.read_only";

export const DEFAULT_SCOPES: readonly string[] = [ANDROID_PUBLISHER_SCOPE, REPORTING_SCOPE];

/**
 * Token-cache key for an (email, scopes) pair. The default scope set keeps the bare email —
 * preserving existing cache entries across upgrades — while any other scope set appends a
 * short digest so differently-scoped tokens can never serve each other.
 */
export function scopedCacheKey(email: string, scopes: readonly string[]): string {
  const sorted = [...scopes].sort();
  if (sorted.join(" ") === [...DEFAULT_SCOPES].sort().join(" ")) return email;
  const digest = createHash("sha256").update(sorted.join(" ")).digest("hex").slice(0, 8);
  return `${email}+${digest}`;
}
