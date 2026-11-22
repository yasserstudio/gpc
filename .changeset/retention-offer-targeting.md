---
"@gpc-cli/api": minor
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

Per-user retention offers: new `gpc purchases subscription target-offer <token> --offer <id>` and `untarget-offer` target or remove a `retentionPerUserRule` offer for one subscriber (Google's `activateOfferTargeting` / `deactivateOfferTargeting`). Google's documented failures map to `OFFER_NOT_PER_USER`, `OFFER_NEVER_ACTIVATED` and `SUBSCRIPTION_EXPIRED` with Google's text kept in `details`. `purchases subscription get` lists targeted offers, and the API types include `developerTargetedOffers`.
