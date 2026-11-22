---
"@gpc-cli/api": minor
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

Retention offers: `offers create` and `offers update` check a retention offer file against Google's retention rules before calling the API and list every problem at once (`RETENTION_OFFER_INVALID`, exit 2). New `gpc subscriptions offers template retention [--per-user]` prints a starting file. API types cover `retentionRule`, `retentionPerUserRule`, `startTime` and `endTime`.
