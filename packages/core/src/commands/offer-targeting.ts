import { PlayApiError } from "@gpc-cli/api";
import type { PlayApiClient } from "@gpc-cli/api";
import { validatePackageName } from "../utils/validation.js";
import { GpcError } from "../errors.js";
import { googleErrorText } from "../utils/google-error.js";

/**
 * Per-user retention offers (Google Play, Nov 2026): target or untarget one
 * `retentionPerUserRule` offer at one subscription purchase. Both calls are
 * idempotent and answer 204.
 *
 * Google documents its failures by status only ("Handle targeting errors" in
 * the retention-offers guide), not by message text, so the mapping keys on the
 * status and a narrow keyword, and anything it does not recognise passes
 * through untouched with Google's message. Google publishes no error bodies
 * for these methods; the live smoke (ROADMAP T11) records the real ones.
 */

type Direction = "target" | "untarget";

/**
 * Trim and require an offer id. Exported so the CLI checks it before a
 * dry run too, and echoes the same id it sends.
 */
export function normalizeOfferId(offerId: string): string {
  const id = offerId.trim();
  if (!id) {
    throw new GpcError(
      "An offer id is required.",
      "OFFER_ID_REQUIRED",
      2,
      "Pass --offer <offer-id>: the id of a retention offer whose targeting is retentionPerUserRule.",
    );
  }
  return id;
}

export async function targetSubscriptionOffer(
  client: PlayApiClient,
  packageName: string,
  token: string,
  offerId: string,
): Promise<void> {
  const id = checkInputs(packageName, offerId);
  try {
    await client.purchases.activateOfferTargeting(packageName, token, id);
  } catch (error) {
    throw translate(error, "target", id);
  }
}

export async function untargetSubscriptionOffer(
  client: PlayApiClient,
  packageName: string,
  token: string,
  offerId: string,
): Promise<void> {
  const id = checkInputs(packageName, offerId);
  try {
    await client.purchases.deactivateOfferTargeting(packageName, token, id);
  } catch (error) {
    throw translate(error, "untarget", id);
  }
}

function checkInputs(packageName: string, offerId: string): string {
  validatePackageName(packageName);
  return normalizeOfferId(offerId);
}

function translate(error: unknown, direction: Direction, offerId: string): unknown {
  if (!(error instanceof PlayApiError)) return error;
  // Google's own words: kept in `details` when http.ts mapped the error, else
  // after the "<METHOD> <path> failed with status N: " prefix. The path itself
  // (":activateOfferTargeting") must never feed the keyword match below.
  const googleText = googleErrorText(error);
  const remap = (code: string, message: string, suggestion: string) =>
    new PlayApiError(message, code, error.statusCode, suggestion, googleText);

  if (error.statusCode === 404 && error.code === "API_NOT_FOUND") {
    return remap(
      error.code,
      error.message,
      "Google did not find this purchase token for this app. Check the token and --app, then run: gpc purchases subscription get <token>",
    );
  }

  // Google documents no 400 for deactivate: untargeting an offer that is not
  // targeted succeeds with no effect.
  if (direction !== "target" || error.statusCode !== 400) return error;

  if (/\bFAILED_PRECONDITION\b/.test(googleText)) {
    if (/expire/i.test(googleText)) {
      return remap(
        "SUBSCRIPTION_EXPIRED",
        `Offer ${offerId} cannot be targeted: the subscription has already expired.`,
        "Targeting needs a subscription that has not expired. Check its state with: gpc purchases subscription get <token>",
      );
    }
    // Not "targeting": every message from this method may say it.
    if (/retention|per[\s_-]?user/i.test(googleText)) {
      return remap(
        "OFFER_NOT_PER_USER",
        `Offer ${offerId} is not a per-user retention offer, so it cannot be targeted at one purchase.`,
        "Only offers whose targeting is { retentionPerUserRule: {} } can be targeted. Create one with: gpc subscriptions offers template retention --per-user",
      );
    }
    return error;
  }
  // INVALID_ARGUMENT is also Google's answer to a malformed token, so only a
  // message about the offer is read as the offer's fault.
  if (/\bINVALID_ARGUMENT\b/.test(googleText) && /\boffer\b/i.test(googleText)) {
    return remap(
      "OFFER_NEVER_ACTIVATED",
      `Offer ${offerId} is not on this subscription's current base plan, or it is still a draft that has never been activated.`,
      "Check the offer id with: gpc subscriptions offers list <product> <base-plan>. A draft offer must be activated once first: gpc subscriptions offers activate <product> <base-plan> <offer>",
    );
  }
  return error;
}
