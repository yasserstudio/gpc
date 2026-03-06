# CI/CD Recipes

Ready-to-use workflows for integrating GPC into CI/CD pipelines.

---

## GitHub Actions

### Basic: Upload & Release to Internal Track

```yaml
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
        run: npm install -g @gpc/cli

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

### Full Pipeline: Build → Internal → Promote to Beta

```yaml
name: Release Pipeline
on:
  workflow_dispatch:
    inputs:
      promote_to:
        description: "Promote to track"
        type: choice
        options: [internal, beta, production]
        default: internal

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version-code: ${{ steps.build.outputs.version_code }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - name: Build
        id: build
        run: |
          ./gradlew bundleRelease
          echo "version_code=$(./gradlew -q printVersionCode)" >> "$GITHUB_OUTPUT"
      - uses: actions/upload-artifact@v4
        with:
          name: release-bundle
          path: app/build/outputs/bundle/release/app-release.aab

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
      - run: npm install -g @gpc/cli
      - name: Upload to Internal
        run: |
          gpc releases upload app-release.aab \
            --track internal \
            --json | tee upload-result.json
      - name: Validate
        run: |
          gpc doctor --json

  promote:
    needs: upload
    if: inputs.promote_to != 'internal'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @gpc/cli
      - name: Promote
        run: |
          gpc releases promote \
            --from internal \
            --to ${{ inputs.promote_to }} \
            ${{ inputs.promote_to == 'production' && '--rollout 10' || '' }} \
            --json
```

### Staged Rollout Automation

```yaml
name: Staged Rollout
on:
  schedule:
    - cron: "0 10 * * 1-5"  # Weekdays at 10am UTC
  workflow_dispatch:

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  rollout:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @gpc/cli

      - name: Check vitals before increasing rollout
        id: vitals
        run: |
          CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
          ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')
          echo "crash_rate=$CRASH_RATE" >> "$GITHUB_OUTPUT"
          echo "anr_rate=$ANR_RATE" >> "$GITHUB_OUTPUT"

      - name: Gate on vitals
        run: |
          # Halt if crash rate > 2% or ANR rate > 0.5%
          if (( $(echo "${{ steps.vitals.outputs.crash_rate }} > 2.0" | bc -l) )); then
            echo "::error::Crash rate too high (${{ steps.vitals.outputs.crash_rate }}%), halting rollout"
            gpc releases rollout halt --track production --json
            exit 1
          fi

      - name: Increase rollout
        run: |
          CURRENT=$(gpc releases status --track production --json | jq -r '.data.rolloutPercentage')
          case $CURRENT in
            10) NEXT=25 ;;
            25) NEXT=50 ;;
            50) NEXT=100 ;;
            *) echo "Rollout at ${CURRENT}%, no action"; exit 0 ;;
          esac
          gpc releases rollout increase --track production --to $NEXT --json
```

### Vitals Monitoring

```yaml
name: Vitals Check
on:
  schedule:
    - cron: "0 */6 * * *"  # Every 6 hours

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
      - run: npm install -g @gpc/cli

      - name: Check vitals
        run: |
          echo "## Vitals Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          gpc vitals overview --json | jq -r '
            .data | to_entries[] |
            "- **\(.key)**: \(.value)"
          ' >> $GITHUB_STEP_SUMMARY

      - name: Alert on degradation
        run: |
          RESULT=$(gpc vitals overview --json)
          CRASH=$(echo "$RESULT" | jq -r '.data.crashRate')
          if (( $(echo "$CRASH > 3.0" | bc -l) )); then
            # Send alert via your preferred channel
            echo "::error::Critical crash rate: ${CRASH}%"
            exit 1
          fi
```

### Metadata Sync on PR

```yaml
name: Listing Sync Check
on:
  pull_request:
    paths: ["metadata/**"]

env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
  GPC_APP: com.example.myapp

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @gpc/cli
      - name: Validate metadata
        run: |
          gpc listings push --dir metadata/ --dry-run --json

  sync:
    needs: validate
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @gpc/cli
      - name: Push metadata
        run: |
          gpc listings push --dir metadata/ --json
```

---

## GitLab CI

### Basic Release

```yaml
release:
  image: node:20
  stage: deploy
  only:
    - tags
  variables:
    GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
    GPC_APP: com.example.myapp
  before_script:
    - npm install -g @gpc/cli
  script:
    - gpc releases upload build/app-release.aab --track internal --json
```

---

## Bitbucket Pipelines

```yaml
pipelines:
  tags:
    "v*":
      - step:
          name: Release to Play Store
          image: node:20
          script:
            - npm install -g @gpc/cli
            - gpc releases upload build/app-release.aab
                --track internal --json
          deployment: production
```

---

## CircleCI

```yaml
version: 2.1
jobs:
  release:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - checkout
      - run:
          name: Install GPC
          command: npm install -g @gpc/cli
      - run:
          name: Upload to Play Store
          command: |
            gpc releases upload build/app-release.aab \
              --track internal --json
```

---

## Common Patterns

### Multi-App Release

```bash
#!/bin/bash
# release-all.sh — Release multiple apps from a monorepo
APPS=("com.example.app1" "com.example.app2" "com.example.app3")

for app in "${APPS[@]}"; do
  echo "Releasing $app..."
  gpc releases upload "builds/${app}/app-release.aab" \
    --app "$app" \
    --track internal \
    --json
done
```

### Pre-Submission Validation

```bash
#!/bin/bash
# validate-release.sh — Run before any upload
set -euo pipefail

echo "Running pre-submission checks..."

# Auth check
gpc auth status --json | jq -e '.data.authenticated' > /dev/null || {
  echo "Not authenticated"; exit 3
}

# Verify AAB exists and is valid
FILE="$1"
if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE"; exit 1
fi

# Check file size (150MB limit)
SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE")
MAX=$((150 * 1024 * 1024))
if (( SIZE > MAX )); then
  echo "File too large: $((SIZE / 1024 / 1024))MB (max 150MB)"; exit 1
fi

echo "All checks passed"
```

### Review Digest (Cron)

```bash
#!/bin/bash
# review-digest.sh — Daily review summary
gpc reviews list \
  --stars 1-3 \
  --since 24h \
  --json \
  | jq -r '.data.reviews[] | "[\(.stars)] \(.text[:100])..."'
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path | Yes (CI) |
| `GPC_APP` | Default package name | Recommended |
| `GPC_PROFILE` | Auth profile name | No |
| `GPC_OUTPUT` | Default output format (`human`/`json`/`yaml`) | No |
| `GPC_NO_COLOR` | Disable color output | No |
| `GPC_NO_INTERACTIVE` | Disable interactive prompts | Auto in CI |
| `GPC_RATE_LIMIT` | Requests per second | No (default: 10) |
| `GPC_CA_CERT` | Custom CA certificate path | No |
| `HTTPS_PROXY` | HTTP proxy URL | No |
