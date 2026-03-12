---
layout: home

hero:
  name: "GPC"
  text: "Google Play CLI"
  tagline: "Ship Android apps from your terminal. 187 API endpoints, one tool."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Commands
      link: /commands/
    - theme: alt
      text: GitHub
      link: https://github.com/yasserstudio/gpc

features:
  - icon:
      src: /icons/layers.svg
    title: Full API Coverage
    details: 187 Google Play Developer API endpoints. Releases, rollouts, metadata, vitals, reviews, subscriptions, purchases, reports, users, and more.
  - icon:
      src: /icons/package.svg
    title: Zero Dependencies
    details: Standalone binary — no Ruby, no JVM, no browser. One curl command to install. Under 500ms cold start.
  - icon:
      src: /icons/terminal.svg
    title: CI/CD Native
    details: Structured JSON output, semantic exit codes (0-6), env var config. Drop into GitHub Actions, GitLab CI, Bitbucket, or CircleCI.
  - icon:
      src: /icons/plug.svg
    title: Plugin System
    details: Extend GPC with lifecycle hooks, custom commands, and integrations. First-party CI plugin included.
  - icon:
      src: /icons/shield.svg
    title: Battle-Tested
    details: 1,255 tests, 90%+ code coverage, security-audited credential handling, automatic secrets redaction.
  - icon:
      src: /icons/activity.svg
    title: Vitals-Gated Releases
    details: Gate deployments on crash rate and ANR thresholds. Exit code 6 when breached — CI stops the rollout automatically.
---

## Install

```bash
# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# npm (includes plugin support)
npm install -g @gpc-cli/cli

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

## Quick Start

```bash
# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Promote to production with staged rollout
gpc releases promote --from internal --to production --rollout 10

# Check app health
gpc vitals overview

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d
```
