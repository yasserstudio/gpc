---
outline: deep
---

# Migrate from Fastlane

Command-by-command migration guide from Fastlane supply to GPC.

## Why Migrate?

| | GPC | Fastlane supply |
|---|---|---|
| API coverage | 162 endpoints | ~20 endpoints |
| Runtime | Node.js or standalone binary | Ruby + Bundler + 150 gems |
| Reviews & Vitals | Yes | No |
| Subscriptions & IAP | Yes | No |
| JSON output | Structured, TTY-aware | Partial |
| Cold start | <500ms | 2-3s |

## Command Mapping

| Fastlane | GPC | Notes |
|----------|-----|-------|
| `fastlane supply --aab app.aab` | `gpc releases upload app.aab` | |
| `fastlane supply --aab app.aab --track beta` | `gpc releases upload app.aab --track beta` | |
| `fastlane supply --aab app.aab --rollout 0.1` | `gpc releases upload app.aab --rollout 10` | Decimal vs percentage |
| `fastlane supply --skip_upload_aab --track production` | `gpc releases promote --from beta --to production` | |
| `fastlane supply --skip_upload_aab` | `gpc listings push --dir metadata/` | Metadata-only push |
| `fastlane supply init` | `gpc listings pull --dir metadata/` | Download listings |

### Key Differences

- **Rollout format:** Fastlane uses decimal (`0.1` = 10%). GPC uses percentage (`10` = 10%).
- **Metadata directory:** Fastlane uses `fastlane/metadata/android/`. GPC supports both `metadata/` (default) and Fastlane format (auto-detected).
- **Auth:** Fastlane uses `SUPPLY_JSON_KEY` or `SUPPLY_JSON_KEY_DATA`. GPC uses `GPC_SERVICE_ACCOUNT`.

## Environment Variables

| Fastlane | GPC |
|----------|-----|
| `SUPPLY_JSON_KEY` | `GPC_SERVICE_ACCOUNT` |
| `SUPPLY_JSON_KEY_DATA` | `GPC_SERVICE_ACCOUNT` (accepts inline JSON) |
| `SUPPLY_PACKAGE_NAME` | `GPC_APP` |

## CI Migration: GitHub Actions

### Before (Fastlane)

```yaml
- name: Deploy to Play Store
  run: |
    bundle install
    bundle exec fastlane supply \
      --aab app.aab \
      --track beta \
      --json_key_data "$SUPPLY_JSON_KEY_DATA"
```

### After (GPC)

```yaml
- name: Deploy to Play Store
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: |
    npm install -g gpc
    gpc releases upload app.aab --track beta
```

## Step-by-Step Migration

1. **Install GPC** — `npm install -g gpc`
2. **Set up auth** — `gpc auth login --service-account key.json`
3. **Test with dry-run** — `gpc listings push --dir metadata/ --dry-run`
4. **Update CI secrets** — Replace `SUPPLY_JSON_KEY` with `GPC_SERVICE_ACCOUNT`
5. **Update CI workflow** — Replace Fastlane commands with GPC equivalents
6. **Remove Fastlane** — Delete `Gemfile`, `fastlane/` directory (optional — can coexist)

## Features GPC Has That Fastlane Doesn't

- `gpc vitals crashes --threshold 2.0` — CI gate on crash rate
- `gpc reviews list --stars 1-2 --since 7d` — Monitor reviews
- `gpc subscriptions list` — Manage subscriptions
- `gpc purchases get <token>` — Verify purchases
- `gpc reports download financial` — Download financial reports
- `gpc users invite` — Manage developer account users
