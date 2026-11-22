---
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

**Breaking for CI scripts:** `purchases subscription cancel-v2`, `defer`, `target-offer` and `untarget-offer` now need `--yes` in a non-interactive run (CI, piped stdin, `--no-interactive`), like refunds already do. Without it they fail with `CONFIRMATION_REQUIRED` (exit 2) and send nothing. They used to confirm themselves. `--dry-run` needs no `--yes`. `defer --expiry` must be an RFC 3339 time with a time zone (`SUBSCRIPTION_EXPIRY_INVALID`), and `cancel-v2 --type` must be one of Google's two types (`CANCELLATION_TYPE_INVALID`). Dry runs show only the start of a purchase token.
