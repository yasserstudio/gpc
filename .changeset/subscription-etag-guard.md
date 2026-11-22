---
"@gpc-cli/api": minor
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

`purchases subscription cancel-v2` and `revoke` accept `--etag`: Google applies the request only if the subscription has not changed since you read the etag with `subscription get`. A mismatch fails with `SUBSCRIPTION_ETAG_MISMATCH` (exit 4); a blank `--etag` fails with `SUBSCRIPTION_ETAG_BLANK` (exit 2) rather than dropping the guard. Without the flag, no etag is sent. The `cancel-v2` docs now list Google's real cancellation types (`USER_REQUESTED_STOP_RENEWALS`, `DEVELOPER_REQUESTED_STOP_PAYMENTS`). API types: optional `etag` on the cancel and revoke contexts.
