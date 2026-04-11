---
outline: deep
---

# Android Release Automation with GPC

Automate your entire Google Play release pipeline from the command line or CI/CD. Upload, promote, monitor, and gate releases without opening a browser.

## The problem

Releasing an Android app involves multiple manual steps:

1. Upload the AAB to the Play Console
2. Assign it to a track (internal, beta, production)
3. Write release notes
4. Set a rollout percentage
5. Monitor crash rates and ANR after release
6. Increase rollout if vitals look good
7. Check reviews for regressions

Most teams either do this manually in the Play Console UI (slow, error-prone) or use partial tools that only cover uploads.

## How GPC automates the full lifecycle

### Upload and release

```bash
gpc releases upload app.aab --track beta --notes "Bug fixes"
```

One command. Handles the edit lifecycle (create, upload, assign track, commit) automatically.

### Promote between tracks

```bash
gpc releases promote --from beta --to production --rollout 10
```

Move a tested release from beta to production at 10% rollout. No browser needed.

### Staged rollout with quality gates

```bash
gpc releases rollout increase --track production --to 50 --vitals-gate
```

Before increasing rollout, GPC checks your crash and ANR rates against configured thresholds. If they exceed the limit, the rollout is blocked and you get an explanation.

### Automated rollout pipeline

```bash
gpc train --track production --stages 5,20,50,100 --time-gate 24h --vitals-gate
```

Rolls out through stages automatically. Waits 24 hours between each stage. Checks vitals before proceeding. Halts if thresholds are breached.

### Pre-upload compliance scanning

```bash
gpc preflight app.aab
```

9 offline policy scanners check your AAB before upload: targetSdk compliance, missing permissions declarations, hardcoded API keys, non-Play billing SDKs, and more. Catches rejections before Google does.

### Post-release monitoring

```bash
gpc status --watch 60 --notify
```

Polls releases, vitals, and reviews every 60 seconds. Desktop notification if a threshold is breached. One command replaces checking 4 Play Console tabs.

## CI/CD integration

### GitHub Actions

```yaml
- name: Release to Play Store
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.SA_KEY }}
    GPC_APP: com.example.app
  run: |
    npm install -g @gpc-cli/cli
    gpc preflight app.aab
    gpc releases upload app.aab --track internal
    gpc status --format summary --refresh
```

### GitLab CI

```yaml
release:
  script:
    - npm install -g @gpc-cli/cli
    - gpc preflight app.aab
    - gpc releases upload app.aab --track internal
    - gpc status --sections vitals
```

GPC works with any CI provider. Semantic exit codes (0 = success, 3 = auth failure, 4 = API error, 6 = threshold breach) let your pipeline react to specific failure types.

### Vitals-gated deployments

```bash
gpc status --sections vitals
gpc releases rollout increase --track production --to 50
```

If vitals are breached, `gpc status` exits code 6. The rollout command never runs. No dashboards, no manual checks.

[Full CI/CD guide](/ci-cd/) | [GitHub Actions](/ci-cd/github-actions) | [Vitals Gates](/ci-cd/vitals-gates)

## What makes GPC different

Most Android release tools stop at uploads. GPC covers the full lifecycle:

| Stage      | What GPC does                             | What others do |
| ---------- | ----------------------------------------- | -------------- |
| Pre-upload | 9 offline policy scanners                 | Nothing        |
| Upload     | AAB/APK upload to any track               | Upload only    |
| Rollout    | Staged rollout with time + vitals gates   | Manual rollout |
| Monitoring | Crash, ANR, reviews in real time          | Nothing        |
| Gating     | Block rollout on vitals thresholds        | Nothing        |
| Metadata   | Sync listings, screenshots, 70+ languages | Partial        |
| Reporting  | Reviews, vitals, financial reports        | Nothing        |

216 API endpoints. One tool. First publishing CLI with Managed Google Play support.

## Get started

```bash
# npm
npm install -g @gpc-cli/cli

# Homebrew
brew install yasserstudio/tap/gpc

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

[Installation](/guide/installation) | [Quick Start](/guide/quick-start) | [Commands](/commands/) | [GitHub](https://github.com/yasserstudio/gpc)
