import type { PlayApiError } from "@gpc-cli/api";

/**
 * Google's own error text from a PlayApiError, without GPC's
 * "<METHOD> <path> failed with status N: " prefix. The api client formats it as
 * "<code> <STATUS>: <message>", so callers can match on the gRPC status too.
 */
export function googleErrorText(error: PlayApiError): string {
  return error.details ?? error.message.replace(/^.*? failed with status \d+: /s, "");
}
