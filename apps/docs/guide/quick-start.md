---
outline: deep
---

# Quick Start

This guide walks through the five most common GPC operations in under 5 minutes: authenticate, upload, promote, check vitals, and monitor reviews.

## Prerequisites

- GPC installed ([Installation](/guide/installation))
- A Google Play Developer account
- A service account JSON key file with Play Console access ([Authentication](/guide/authentication) has full setup steps)

## Step 1: Authenticate

Set up authentication with a service account key file:

```bash
gpc auth login --service-account /path/to/service-account-key.json
```

Expected output:

```
Authenticated as play-deploy@my-project.iam.gserviceaccount.com
Profile "default" saved
```

Verify authentication is working:

```bash
gpc auth status
```

Expected output:

```
Profile:    default
Identity:   play-deploy@my-project.iam.gserviceaccount.com
Method:     service-account
Token:      valid (expires in 58 minutes)
Scopes:     https://www.googleapis.com/auth/androidpublisher
```

## Step 2: Set Your Default App

Configure a default app package name so you do not need to pass `--app` on every command:

```bash
gpc config set app com.example.myapp
```

Expected output:

```
Config updated: app = com.example.myapp
```

Verify your full configuration:

```bash
gpc config show
```

Expected output:

```
app:        com.example.myapp
profile:    default
output:     table (auto)
```

## Step 3: Upload a Release

Upload an AAB file to the internal testing track:

```bash
gpc releases upload app-release.aab --track internal
```

Expected output:

```
Uploading app-release.aab (24.3 MB)
 ████████████████████████████████ 100%

Upload complete
  Version code:  42
  Track:         internal
  Status:        completed
```

To upload and set release notes in one command, use `publish`:

```bash
gpc publish app-release.aab --track internal --notes "Bug fixes and performance improvements"
```

Expected output:

```
Uploading app-release.aab (24.3 MB)
 ████████████████████████████████ 100%

Upload complete
  Version code:  42
  Track:         internal
  Status:        completed
  Notes (en-US): Bug fixes and performance improvements
  Edit:          committed
```

## Step 4: Promote to Beta

Promote the release from internal testing to the beta track:

```bash
gpc releases promote --from internal --to beta
```

Expected output:

```
Promoted version 42
  From:   internal
  To:     beta
  Status: completed
```

To promote to production with a staged rollout:

```bash
gpc releases promote --from beta --to production --rollout 10
```

Expected output:

```
Promoted version 42
  From:     beta
  To:       production
  Rollout:  10%
  Status:   inProgress
```

Increase the rollout later:

```bash
gpc releases rollout increase --track production --to 50
```

Expected output:

```
Rollout updated
  Track:      production
  Version:    42
  Rollout:    10% -> 50%
  Status:     inProgress
```

Complete the rollout to 100%:

```bash
gpc releases rollout complete --track production
```

Expected output:

```
Rollout completed
  Track:      production
  Version:    42
  Rollout:    100%
  Status:     completed
```

## Step 5: Check Vitals

View crash rate and ANR metrics for your app:

```bash
gpc vitals overview
```

Expected output:

```
Vitals Overview — com.example.myapp

Metric                    Value     Threshold   Status
Crash rate (user)         0.82%     2.00%       OK
ANR rate (user)           0.15%     0.47%       OK
Cold startup (p50)        812ms     —           —
Warm startup (p50)        340ms     —           —
Slow frames              4.2%      —           —
Excessive wakeups        0.1%      —           —
```

Check crash clusters for a specific version:

```bash
gpc vitals crashes --version 42
```

Expected output:

```
Crash Clusters — com.example.myapp (version 42)

Cluster                                    Count    Rate
NullPointerException at MainActivity:42    127      0.31%
OutOfMemoryError at ImageLoader:88         43       0.10%
```

Use vitals as a CI quality gate (exits with code 6 if threshold is breached):

```bash
gpc vitals crashes --threshold 2.0
```

If the crash rate is below 2.0%, exit code is 0. If it exceeds 2.0%, exit code is 6.

## Step 6: Monitor Reviews

List recent reviews:

```bash
gpc reviews list
```

Expected output:

```
Reviews — com.example.myapp

Stars  Date        Language  Review
★★★★★  2026-03-08  en-US     Great app! Love the new update.
★★☆☆☆  2026-03-07  en-US     Crashes on startup since last update.
★★★★☆  2026-03-07  ja-JP     使いやすいです。
```

Filter to low-rated reviews from the last 7 days:

```bash
gpc reviews list --stars 1-2 --since 7d
```

Expected output:

```
Reviews — com.example.myapp (1-2 stars, last 7 days)

Stars  Date        Language  Review
★★☆☆☆  2026-03-07  en-US     Crashes on startup since last update.
★☆☆☆☆  2026-03-05  de-DE     Stürzt immer ab.
```

Reply to a review:

```bash
gpc reviews reply abc123def456 "Thank you for the feedback. We have fixed the crash in version 43."
```

Expected output:

```
Reply sent to review abc123def456
```

## Interactive Mode

When you omit required options on write commands, GPC prompts you interactively:

```bash
# No --track specified — GPC asks which track to use
gpc releases upload app.aab
# ? Select track: (Use arrow keys)
#   internal
# > beta
#   alpha
#   production

# Destructive commands prompt for confirmation
gpc subscriptions delete premium_monthly
# ? Delete subscription "premium_monthly"? This cannot be undone. (y/N)
```

To skip all prompts (required in CI), use the `--yes` flag or set the environment variable:

```bash
gpc releases upload app.aab --track beta --yes
# or
GPC_NO_INTERACTIVE=1 gpc releases upload app.aab --track beta
```

## Dry Run

Preview what a write command would do without making any changes:

```bash
gpc releases upload app.aab --track beta --dry-run
```

```
[dry-run] Would upload app.aab (24.3 MB) to track "beta"
[dry-run] Version code: 43
[dry-run] No changes were made
```

```bash
gpc releases promote --from beta --to production --dry-run
```

```
[dry-run] Would promote version 43
[dry-run]   From:   beta
[dry-run]   To:     production
[dry-run] No changes were made
```

The `--dry-run` flag is available on all write commands (`upload`, `promote`, `create`, `update`, `delete`, `sync`).

## Full Workflow in CI

Combine these steps into a CI pipeline:

```bash
#!/bin/bash
set -euo pipefail

# Authenticate (service account JSON stored as CI secret)
gpc auth login --service-account "$GPC_SERVICE_ACCOUNT_JSON"

# Set the app
gpc config set app com.example.myapp

# Upload to internal track
gpc publish app-release.aab --track internal --notes "Build $CI_BUILD_NUMBER"

# Check vitals before promoting (exit code 6 = threshold breach)
gpc vitals crashes --threshold 2.0
gpc vitals anr --threshold 0.47

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Get status in JSON for downstream processing
gpc releases status --output json
```

## Next Steps

- [Authentication](/guide/authentication) -- Full guide to all 4 auth methods and Play Console setup
- [Configuration](/guide/configuration) -- Config files, environment variables, and profiles
- [Commands](/commands/) -- Complete command reference
- [CI/CD Integration](/ci-cd/) -- GitHub Actions, GitLab CI, and more
