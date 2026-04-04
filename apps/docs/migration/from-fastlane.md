---
outline: deep
---

# Migrate from Fastlane

GPC replaces `fastlane supply` (and parts of `fastlane deliver`) for Google Play operations. This guide maps Fastlane commands, environment variables, and CI configurations to their GPC equivalents.

## Why Migrate?

|                       | GPC                               | Fastlane supply            |
| --------------------- | --------------------------------- | -------------------------- |
| API coverage          | 215 endpoints                     | ~20 endpoints              |
| Runtime               | Node.js or standalone binary      | Ruby + Bundler + 150+ gems |
| Reviews and Vitals    | Yes                               | No                         |
| Subscriptions and IAP | Yes                               | No                         |
| JSON output           | Structured, TTY-aware             | Partial                    |
| Cold start            | <500ms                            | 2-3s                       |
| Rollout control       | halt/resume/complete              | Upload with rollout only   |
| CI quality gates      | Exit code 6 on threshold breach   | Not available              |
| Dry-run               | `--dry-run` on all write commands | Not available              |

## Command Mapping

### Uploads and Releases

| Fastlane                                                         | GPC                                                           | Notes                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `fastlane supply --aab app.aab`                                  | `gpc releases upload app.aab`                                 | Defaults to internal track                  |
| `fastlane supply --aab app.aab --track beta`                     | `gpc releases upload app.aab --track beta`                    | Same track names                            |
| `fastlane supply --aab app.aab --track production --rollout 0.1` | `gpc releases upload app.aab --track production --rollout 10` | GPC uses percentage (10), not decimal (0.1) |
| `fastlane supply --apk app.apk`                                  | `gpc releases upload app.apk`                                 | APK also supported                          |
| `fastlane supply --aab app.aab --mapping mapping.txt`            | `gpc releases upload app.aab --mapping mapping.txt`           | Same behavior                               |

### Metadata and Listings

| Fastlane                                                                        | GPC                                  | Notes                          |
| ------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------ |
| `fastlane supply --skip_upload_aab`                                             | `gpc listings push --dir metadata/`  | Push metadata only             |
| `fastlane supply --skip_upload_aab --skip_upload_metadata --skip_upload_images` | `gpc releases upload app.aab`        | Upload binary only             |
| `fastlane supply init`                                                          | `gpc listings pull --dir metadata/`  | Download all metadata to local |
| `fastlane supply --metadata_path ./metadata`                                    | `gpc listings push --dir ./metadata` | Same concept                   |

### Screenshots and Images

| Fastlane                                                   | GPC                                                                               | Notes                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------- |
| `fastlane supply --skip_upload_aab --skip_upload_metadata` | `gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png` | Upload screenshots    |
| N/A                                                        | `gpc listings images list --lang en-US --type phoneScreenshots`                   | List existing images  |
| N/A                                                        | `gpc listings images delete --lang en-US --type phoneScreenshots --id <id>`       | Delete specific image |

### Rollout Management

| Fastlane                                                     | GPC                                                        | Notes                  |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------- |
| `fastlane supply --track production --rollout 0.5`           | `gpc releases rollout increase --track production --to 50` | Percentage vs decimal  |
| `fastlane supply --track_promote_to production --track beta` | `gpc releases promote --from beta --to production`         | Clearer flag names     |
| N/A                                                          | `gpc releases rollout halt --track production`             | No Fastlane equivalent |
| N/A                                                          | `gpc releases rollout resume --track production`           | No Fastlane equivalent |
| N/A                                                          | `gpc releases rollout complete --track production`         | No Fastlane equivalent |

### Commands Only in GPC

| GPC Command                              | Description                    |
| ---------------------------------------- | ------------------------------ |
| `gpc vitals crashes`                     | Crash rate and clusters        |
| `gpc vitals anr`                         | ANR rate                       |
| `gpc vitals crashes --threshold 2.0`     | CI quality gate (exit code 6)  |
| `gpc reviews list --stars 1-2`           | Filter and list reviews        |
| `gpc reviews reply <id> --text "Thanks"` | Reply to reviews               |
| `gpc subscriptions list`                 | Manage subscriptions           |
| `gpc iap list`                           | Manage in-app products         |
| `gpc purchases get <token>`              | Verify purchases               |
| `gpc reports download financial`         | Download financial reports     |
| `gpc users invite <email>`               | Manage developer account users |
| `gpc testers add <email>`                | Manage beta testers            |

## Environment Variables

| Fastlane               | GPC                   | Format                                                          |
| ---------------------- | --------------------- | --------------------------------------------------------------- |
| `SUPPLY_JSON_KEY`      | `GPC_SERVICE_ACCOUNT` | File path or JSON string                                        |
| `SUPPLY_JSON_KEY_DATA` | `GPC_SERVICE_ACCOUNT` | GPC accepts both file path and inline JSON in the same variable |
| `SUPPLY_PACKAGE_NAME`  | `GPC_APP`             | Package name                                                    |
| N/A                    | `GPC_DEVELOPER_ID`    | Required for user management (Fastlane does not support this)   |

## Rollout Values: Decimal vs Percentage

This is the most common gotcha when migrating. Fastlane uses decimal fractions (0.0-1.0), GPC uses percentages (0-100).

| Fastlane         | GPC                     | Meaning       |
| ---------------- | ----------------------- | ------------- |
| `--rollout 0.01` | `--rollout 1`           | 1% of users   |
| `--rollout 0.05` | `--rollout 5`           | 5% of users   |
| `--rollout 0.1`  | `--rollout 10`          | 10% of users  |
| `--rollout 0.5`  | `--rollout 50`          | 50% of users  |
| `--rollout 1.0`  | `--rollout 100` or omit | 100% of users |

## Metadata Directory Format

GPC supports the Fastlane metadata directory structure. If you already have a `metadata/` or `fastlane/metadata/android/` directory, it works with `gpc listings push`.

### Fastlane Format (supported by GPC)

```
metadata/
├── en-US/
│   ├── title.txt
│   ├── short_description.txt
│   ├── full_description.txt
│   ├── changelogs/
│   │   └── 42.txt              # Version code
│   └── images/
│       ├── phoneScreenshots/
│       │   ├── 1.png
│       │   └── 2.png
│       ├── icon.png
│       └── featureGraphic.png
├── ja-JP/
│   ├── title.txt
│   ├── short_description.txt
│   └── full_description.txt
```

### GPC Commands with Fastlane Directory

```bash
# Download current listings to Fastlane-compatible directory
gpc listings pull --dir metadata/

# Push local metadata to Play Console
gpc listings push --dir metadata/

# Preview changes without applying (dry-run)
gpc listings push --dir metadata/ --dry-run

# Push release notes from changelogs directory
gpc releases notes set --track beta --file metadata/en-US/changelogs/
```

## CI Migration: GitHub Actions

### Before (Fastlane)

```yaml
# .github/workflows/release.yml (Fastlane)
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Build
        run: ./gradlew bundleRelease

      - name: Deploy to Play Store
        env:
          SUPPLY_JSON_KEY_DATA: ${{ secrets.PLAY_STORE_KEY }}
          SUPPLY_PACKAGE_NAME: com.example.myapp
        run: |
          bundle exec fastlane supply \
            --aab app/build/outputs/bundle/release/app-release.aab \
            --track internal
```

### After (GPC)

```yaml
# .github/workflows/release.yml (GPC)
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Build
        run: ./gradlew bundleRelease

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Deploy to Play Store
        env:
          GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
          GPC_APP: com.example.myapp
        run: |
          npm install -g @gpc-cli/cli
          gpc releases upload \
            app/build/outputs/bundle/release/app-release.aab \
            --track internal \
            --json
```

**Key differences:**

- No Ruby/Bundler setup required
- Node.js setup instead (or use standalone binary for zero dependencies)
- Environment variables renamed (`SUPPLY_JSON_KEY` to `GPC_SERVICE_ACCOUNT`)
- `--json` flag for machine-readable output
- No Gemfile or Fastfile needed

## CI Migration: GitLab CI

### Before (Fastlane)

```yaml
release:
  image: ruby:3.2
  stage: deploy
  before_script:
    - gem install fastlane
  script:
    - |
      fastlane supply \
        --aab build/app-release.aab \
        --track internal \
        --json_key_data "$SUPPLY_JSON_KEY_DATA"
  only:
    - tags
```

### After (GPC)

```yaml
release:
  image: node:20
  stage: deploy
  before_script:
    - npm install -g @gpc-cli/cli
  script:
    - gpc releases upload build/app-release.aab --track internal --json
  variables:
    GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
    GPC_APP: com.example.myapp
  only:
    - tags
```

## Fastfile to Shell Script

If you have a complex Fastfile, translate each lane to a shell script or CI step.

### Fastfile

```ruby
lane :deploy do
  gradle(task: "bundleRelease")
  supply(
    aab: "app/build/outputs/bundle/release/app-release.aab",
    track: "internal",
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true,
  )
end

lane :promote_to_beta do
  supply(
    track: "internal",
    track_promote_to: "beta",
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true,
  )
end

lane :metadata do
  supply(
    skip_upload_aab: true,
    skip_upload_apk: true,
    metadata_path: "./metadata",
  )
end
```

### GPC Equivalent

```bash
#!/bin/bash
# deploy.sh — replaces Fastfile lanes
set -euo pipefail

deploy() {
  ./gradlew bundleRelease
  gpc releases upload \
    app/build/outputs/bundle/release/app-release.aab \
    --track internal \
    --json
}

promote_to_beta() {
  gpc releases promote --from internal --to beta --json
}

metadata() {
  gpc listings push --dir ./metadata --json
}

# Run the requested lane
"${1:-deploy}"
```

## Step-by-Step Migration

1. **Install GPC** -- `npm install -g gpc` or use the standalone binary
2. **Set up auth** -- `gpc auth login --service-account key.json`
3. **Test with dry-run** -- `gpc listings push --dir metadata/ --dry-run`
4. **Update CI secrets** -- Replace `SUPPLY_JSON_KEY` with `GPC_SERVICE_ACCOUNT`
5. **Update CI workflow** -- Replace Fastlane commands with GPC equivalents
6. **Verify** -- Run `gpc doctor` to confirm everything is connected
7. **Remove Fastlane** -- Delete `Gemfile`, `fastlane/` directory (optional, can coexist during transition)

## Related

- [GPC vs Fastlane Supply](/alternatives/fastlane) -- side-by-side feature comparison
- [GitHub Actions](/ci-cd/github-actions) -- full CI/CD setup guide
- [Quick Start](/guide/quick-start) -- get running in 5 minutes
