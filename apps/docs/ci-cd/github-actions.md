---
outline: deep
---

# GitHub Actions

Complete, copy-pasteable workflows for GitHub Actions. Each workflow is self-contained -- copy it into `.github/workflows/` and configure secrets.

## Prerequisites

1. A Google Cloud service account with Play Console permissions
2. The service account JSON stored as a GitHub Actions secret named `GPC_SERVICE_ACCOUNT`
3. Your app's package name (e.g., `com.example.myapp`)

```bash
# Store service account as a secret (via GitHub CLI)
gh secret set GPC_SERVICE_ACCOUNT < service-account.json
```

## Basic: Upload on Tag Push

Triggers on version tags. Builds the AAB and uploads to the internal testing track.

```yaml
# .github/workflows/release-internal.yml
name: Release to Internal
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

      - name: Build AAB
        run: ./gradlew bundleRelease

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Upload to Internal Track
        env:
          GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
          GPC_APP: com.example.myapp
        run: |
          gpc releases upload \
            app/build/outputs/bundle/release/app-release.aab \
            --track internal \
            --notes "Build from ${{ github.ref_name }}" \
            --json
```

## Full Pipeline: Build, Upload, Promote

Three-stage pipeline with manual track selection. Use `workflow_dispatch` to trigger from the GitHub UI with a track dropdown.

```yaml
# .github/workflows/release-pipeline.yml
name: Release Pipeline
on:
  workflow_dispatch:
    inputs:
      track:
        description: "Target track"
        type: choice
        options:
          - internal
          - beta
          - production
        default: internal
      rollout_percentage:
        description: "Rollout percentage (production only)"
        type: number
        default: 10
      release_notes:
        description: "Release notes (en-US)"
        type: string
        default: "Bug fixes and performance improvements"

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      aab-path: ${{ steps.build.outputs.aab_path }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Build release AAB
        id: build
        run: |
          ./gradlew bundleRelease
          AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
          echo "aab_path=$AAB_PATH" >> "$GITHUB_OUTPUT"

      - uses: actions/upload-artifact@v4
        with:
          name: release-bundle
          path: app/build/outputs/bundle/release/app-release.aab
          retention-days: 7

  upload:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: release-bundle

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Preflight compliance check
        run: gpc preflight app-release.aab --fail-on error --json

      - name: Upload to internal track
        run: |
          gpc releases upload app-release.aab \
            --track internal \
            --notes "${{ inputs.release_notes }}" \
            --json | tee upload-result.json

      - name: Write step summary
        run: |
          echo "## Upload Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          gpc releases status --track internal --output markdown >> $GITHUB_STEP_SUMMARY

  promote:
    needs: upload
    if: inputs.track != 'internal'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Promote to target track
        run: |
          ROLLOUT_FLAG=""
          if [[ "${{ inputs.track }}" == "production" ]]; then
            ROLLOUT_FLAG="--rollout ${{ inputs.rollout_percentage }}"
          fi

          gpc releases promote \
            --from internal \
            --to ${{ inputs.track }} \
            $ROLLOUT_FLAG \
            --json

      - name: Write step summary
        run: |
          echo "## Promotion Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Promoted to **${{ inputs.track }}**" >> $GITHUB_STEP_SUMMARY
          gpc releases status --track ${{ inputs.track }} --output markdown >> $GITHUB_STEP_SUMMARY
```

## Staged Rollout Automation

Runs on a cron schedule (weekdays at 10am UTC). Checks vitals before each rollout increase. Follows the progression: 10% -> 25% -> 50% -> 100%.

```yaml
# .github/workflows/staged-rollout.yml
name: Staged Rollout
on:
  schedule:
    - cron: "0 10 * * 1-5" # Weekdays at 10am UTC
  workflow_dispatch: # Manual trigger

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp
  CRASH_THRESHOLD: "2.0"
  ANR_THRESHOLD: "0.5"

jobs:
  rollout:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Check current rollout status
        id: status
        run: |
          STATUS=$(gpc releases status --track production --json)
          CURRENT=$(echo "$STATUS" | jq -r '.data.rolloutPercentage // "100"')
          RELEASE_STATUS=$(echo "$STATUS" | jq -r '.data.status // "completed"')
          echo "current=$CURRENT" >> "$GITHUB_OUTPUT"
          echo "release_status=$RELEASE_STATUS" >> "$GITHUB_OUTPUT"
          echo "Current rollout: ${CURRENT}% (status: $RELEASE_STATUS)"

      - name: Check vitals before increasing
        id: vitals
        if: steps.status.outputs.release_status == 'inProgress'
        run: |
          CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
          ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')
          echo "crash_rate=$CRASH_RATE" >> "$GITHUB_OUTPUT"
          echo "anr_rate=$ANR_RATE" >> "$GITHUB_OUTPUT"
          echo "Crash rate: ${CRASH_RATE}%, ANR rate: ${ANR_RATE}%"

      - name: Gate on vitals
        if: steps.status.outputs.release_status == 'inProgress'
        run: |
          CRASH="${{ steps.vitals.outputs.crash_rate }}"
          ANR="${{ steps.vitals.outputs.anr_rate }}"

          if (( $(echo "$CRASH > $CRASH_THRESHOLD" | bc -l) )); then
            echo "::error::Crash rate ${CRASH}% exceeds threshold ${CRASH_THRESHOLD}%"
            gpc releases rollout halt --track production --json
            echo "## Rollout Halted" >> $GITHUB_STEP_SUMMARY
            echo "Crash rate **${CRASH}%** exceeded threshold **${CRASH_THRESHOLD}%**" >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

          if (( $(echo "$ANR > $ANR_THRESHOLD" | bc -l) )); then
            echo "::error::ANR rate ${ANR}% exceeds threshold ${ANR_THRESHOLD}%"
            gpc releases rollout halt --track production --json
            echo "## Rollout Halted" >> $GITHUB_STEP_SUMMARY
            echo "ANR rate **${ANR}%** exceeded threshold **${ANR_THRESHOLD}%**" >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

          echo "Vitals healthy. Crash: ${CRASH}%, ANR: ${ANR}%"

      - name: Increase rollout
        if: steps.status.outputs.release_status == 'inProgress'
        run: |
          CURRENT="${{ steps.status.outputs.current }}"

          case $CURRENT in
            10) NEXT=25 ;;
            25) NEXT=50 ;;
            50) NEXT=100 ;;
            *)
              echo "Rollout at ${CURRENT}%, no scheduled increase"
              echo "## No Action" >> $GITHUB_STEP_SUMMARY
              echo "Rollout is at **${CURRENT}%** -- no scheduled increase." >> $GITHUB_STEP_SUMMARY
              exit 0
              ;;
          esac

          echo "Increasing rollout from ${CURRENT}% to ${NEXT}%"

          if [[ "$NEXT" == "100" ]]; then
            gpc releases rollout complete --track production --json
          else
            gpc releases rollout increase --track production --to $NEXT --json
          fi

          echo "## Rollout Increased" >> $GITHUB_STEP_SUMMARY
          echo "Rollout increased from **${CURRENT}%** to **${NEXT}%**" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value | Threshold |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|-----------|" >> $GITHUB_STEP_SUMMARY
          echo "| Crash rate | ${{ steps.vitals.outputs.crash_rate }}% | ${CRASH_THRESHOLD}% |" >> $GITHUB_STEP_SUMMARY
          echo "| ANR rate | ${{ steps.vitals.outputs.anr_rate }}% | ${ANR_THRESHOLD}% |" >> $GITHUB_STEP_SUMMARY

      - name: Skip if not in progress
        if: steps.status.outputs.release_status != 'inProgress'
        run: |
          echo "Release status is '${{ steps.status.outputs.release_status }}', not 'inProgress'. Skipping."
          echo "## No Active Rollout" >> $GITHUB_STEP_SUMMARY
          echo "No staged rollout in progress. Status: **${{ steps.status.outputs.release_status }}**" >> $GITHUB_STEP_SUMMARY
```

## Vitals Monitoring

Scheduled vitals check every 6 hours. Writes a dashboard to the step summary and fails the workflow if critical thresholds are breached (useful for triggering alerts via GitHub Actions notifications).

```yaml
# .github/workflows/vitals-monitor.yml
name: Vitals Monitor
on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours
  workflow_dispatch:

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Collect vitals
        id: vitals
        run: |
          echo "## Vitals Dashboard" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY

          CRASHES=$(gpc vitals crashes --json)
          ANR=$(gpc vitals anr --json)
          STARTUP=$(gpc vitals startup --json)

          CRASH_RATE=$(echo "$CRASHES" | jq -r '.data.crashRate')
          ANR_RATE=$(echo "$ANR" | jq -r '.data.anrRate')
          COLD_START=$(echo "$STARTUP" | jq -r '.data.coldStartTime // "N/A"')

          echo "| Crash rate | ${CRASH_RATE}% |" >> $GITHUB_STEP_SUMMARY
          echo "| ANR rate | ${ANR_RATE}% |" >> $GITHUB_STEP_SUMMARY
          echo "| Cold start | ${COLD_START}ms |" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          echo "crash_rate=$CRASH_RATE" >> "$GITHUB_OUTPUT"
          echo "anr_rate=$ANR_RATE" >> "$GITHUB_OUTPUT"

      - name: Check for anomalies
        run: |
          ANOMALIES=$(gpc vitals anomalies --json | jq -r '.data.anomalies // []')
          COUNT=$(echo "$ANOMALIES" | jq 'length')

          if [[ "$COUNT" -gt 0 ]]; then
            echo "### Anomalies Detected" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "$ANOMALIES" | jq -r '.[] | "- **\(.metric)**: \(.description)"' >> $GITHUB_STEP_SUMMARY
          fi

      - name: Week-over-week comparison
        run: |
          echo "### Trend Comparison (7-day)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          gpc vitals compare crashes --days 7 --output markdown >> $GITHUB_STEP_SUMMARY

      - name: Alert on critical thresholds
        run: |
          CRASH="${{ steps.vitals.outputs.crash_rate }}"
          ANR="${{ steps.vitals.outputs.anr_rate }}"

          ALERT=false

          if (( $(echo "$CRASH > 3.0" | bc -l) )); then
            echo "::error::Critical crash rate: ${CRASH}% (threshold: 3.0%)"
            ALERT=true
          fi

          if (( $(echo "$ANR > 1.0" | bc -l) )); then
            echo "::error::Critical ANR rate: ${ANR}% (threshold: 1.0%)"
            ALERT=true
          fi

          if [[ "$ALERT" == "true" ]]; then
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "### ALERT: Critical thresholds breached" >> $GITHUB_STEP_SUMMARY
            exit 1
          fi
```

## Metadata Sync on PR

Validates metadata changes on pull request (dry-run). Pushes metadata to Play Console when the PR merges.

```yaml
# .github/workflows/metadata-sync.yml
name: Metadata Sync
on:
  pull_request:
    paths: ["metadata/**"]
  push:
    branches: [main]
    paths: ["metadata/**"]

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  validate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Dry-run metadata push
        run: |
          echo "## Metadata Validation (dry-run)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          gpc listings push --dir metadata/ --dry-run --json | tee dry-run.json

          # Show what would change
          echo "### Changes Preview" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          jq -r '.data.changes[]? | "- **\(.language)**: \(.field) changed"' dry-run.json >> $GITHUB_STEP_SUMMARY || echo "No changes detected" >> $GITHUB_STEP_SUMMARY

  sync:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Push metadata to Play Console
        run: |
          gpc listings push --dir metadata/ --json

          echo "## Metadata Synced" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Metadata from \`metadata/\` pushed to Play Console." >> $GITHUB_STEP_SUMMARY
```

## Multi-App Monorepo Release

Release multiple apps from a monorepo with a matrix strategy.

```yaml
# .github/workflows/multi-app-release.yml
name: Multi-App Release
on:
  push:
    tags: ["v*"]

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}

jobs:
  release:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app:
          - package: com.example.app1
            module: app1
          - package: com.example.app2
            module: app2
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Build ${{ matrix.app.module }}
        run: ./gradlew :${{ matrix.app.module }}:bundleRelease

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Upload ${{ matrix.app.package }}
        env:
          GPC_APP: ${{ matrix.app.package }}
        run: |
          gpc releases upload \
            ${{ matrix.app.module }}/build/outputs/bundle/release/${{ matrix.app.module }}-release.aab \
            --track internal \
            --notes "Release ${{ github.ref_name }}" \
            --json
```

## Flutter Release

Workflow for Flutter apps. Builds the AAB using `flutter build appbundle` and uploads with GPC.

```yaml
# .github/workflows/flutter-release.yml
name: Flutter Release
on:
  push:
    tags: ["v*"]

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.flutterapp

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.24.0"
          channel: stable

      - name: Build AAB
        run: flutter build appbundle --release

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Upload to Internal
        run: |
          gpc releases upload \
            build/app/outputs/bundle/release/app-release.aab \
            --track internal \
            --notes "Flutter build ${{ github.ref_name }}" \
            --json
```

## Generate GitHub Release Notes

Auto-generate the release notes body from your local git log when cutting a tag. `gpc changelog generate` (v0.9.61+) clusters related commits, lints subjects against project voice, and emits canonical markdown that pipes straight into `gh release create -F -`.

```yaml
# .github/workflows/release.yml
name: Cut Release
on:
  push:
    tags: ["v*"]

permissions:
  contents: write # required for gh release create

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # required so gpc can read the full git history

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Enforce voice in release notes
        run: gpc changelog generate --strict
        # Fails the workflow if any commit subject contains internal jargon
        # (e.g., "mutex", "token bucket", "homedir"). Forces consistency.

      - name: Publish GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gpc changelog generate | gh release create ${{ github.ref_name }} -F -
```

### Play Store per-locale "What's new" (v0.9.62+)

Generate per-locale Play Store release notes in the same workflow. `gpc changelog generate --target play-store --locales auto` reads your live listing's locale list and emits a character-budget meter for each.

```yaml
- name: Generate Play Store changelog
  run: |
    gpc changelog generate --target play-store \
      --locales auto \
      --format json \
      --app com.example.app \
      --strict > play-store-notes.json
  # --strict exits 1 if any locale overflows 500 chars.
```

For opt-in AI translation of the `[needs translation]` placeholders, wait for v0.9.63 (Vercel AI SDK integration). To wire translated notes back into a draft release, wait for v0.9.64.

For uploading pre-written release notes alongside an AAB, see [gpc publish --notes-from-git](/commands/publish) or [gpc releases create --notes-from-git](/commands/releases).

## Related

- [Vitals Gates](/ci-cd/vitals-gates) -- gate deployments on crash and ANR rates
- [`gpc status`](/commands/status) -- post-deploy health snapshot
- [`gpc changelog generate`](/guide/changelog-generation) -- full feature guide
- [Migrate from Fastlane](/migration/from-fastlane) -- CI workflow migration guide
