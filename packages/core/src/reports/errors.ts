import { GpcError } from "../errors.js";

/**
 * Typed errors for the GCS report-download path. Exit code 4 (API) across the board: these
 * are all failures talking to the Google Cloud Storage side of Play, distinct from usage
 * errors (invalid type/month, exit 2) which stay in the command layer.
 */

/**
 * The service account authenticated but is not authorized to read the reports bucket. This
 * is the common first-run failure: the "download bulk reports" permission is NOT granted to
 * a service account automatically, only to your own user.
 */
export function reportAccessDeniedError(bucket: string): GpcError {
  return new GpcError(
    `Access denied reading the Play reports bucket "${bucket}".`,
    "REPORT_ACCESS_DENIED",
    4,
    "Grant the service account access: Play Console -> Users & permissions -> the service " +
      "account -> Account permissions -> enable 'View app information and download bulk " +
      "reports (read-only)', then wait a few minutes for it to propagate.",
  );
}

/**
 * Google rejected the credential itself (HTTP 401) — distinct from a valid credential
 * lacking the bucket grant (403). Exit 3 (auth), matching the project's exit-code contract.
 */
export function reportAuthRejectedError(bucket: string): GpcError {
  return new GpcError(
    `Authentication was rejected reading the Play reports bucket "${bucket}".`,
    "REPORT_AUTH_REJECTED",
    3,
    "The access token was not accepted. Check the service account key is valid (gpc auth " +
      "status) and that your system clock is accurate, then retry.",
  );
}

/** The bucket name does not exist (or the account cannot see it at all). */
export function reportBucketNotFoundError(bucket: string): GpcError {
  return new GpcError(
    `Play reports bucket "${bucket}" was not found.`,
    "REPORT_BUCKET_NOT_FOUND",
    4,
    "Confirm the bucket name. Copy the exact Cloud Storage URI from Play Console -> " +
      "Download reports, then set it with --bucket or the 'reports.bucket' config key. The " +
      "default is pubsite_prod_<developerId>.",
  );
}

/** No object matched the requested report type / month / dimension. */
export function reportObjectNotFoundError(opts: {
  reportType: string;
  month: string;
  dimension?: string;
  available?: string[];
}): GpcError {
  const { reportType, month, dimension, available } = opts;
  const dimPart = dimension ? ` dimension "${dimension}"` : "";
  const availPart =
    available && available.length
      ? ` Available: ${available.join(", ")}.`
      : " No matching report objects were found for that month.";
  return new GpcError(
    `No "${reportType}" report found for ${month}${dimPart}.`,
    "REPORT_OBJECT_NOT_FOUND",
    4,
    `Check the month is complete and the report type/dimension exist.${availPart} Reports for ` +
      "the current month may not be published until it ends.",
  );
}
