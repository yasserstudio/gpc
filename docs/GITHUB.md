# GitHub Repository Management

> All repo management is done via **GitHub CLI (`gh`)** — no web UI clicks.
> Install: `brew install gh` | Docs: https://cli.github.com/manual/

---

## Tooling: `gh` CLI

We use `gh` for all GitHub operations to keep repo management scriptable, reproducible, and terminal-native — matching GPC's own philosophy.

### Common Operations

```bash
# Issues
gh issue create --title "..." --label "bug,pkg:core"
gh issue list --label "p0:critical"
gh issue close 42 --reason completed

# Labels (bulk create/edit)
gh label create "pkg:core" --color "1d76db" --description "@gpc/core"
gh label list

# Releases
gh release create v0.8.0 --generate-notes
gh release list

# PRs (when using branches)
gh pr create --title "feat(cli): add export command" --base main
gh pr merge 12 --squash

# Repo settings
gh repo edit --enable-issues --disable-wiki --delete-branch-on-merge

# Workflows
gh workflow list
gh run list --workflow ci.yml
gh run view <run-id> --log-failed

# Search issues/PRs
gh issue list --search "is:open label:bug sort:updated-desc"
gh pr list --search "is:open review:required"
```

### Automation Scripts

Repo setup can be fully scripted. See [Setup Scripts](#setup-scripts) below.

---

## Branch Strategy

**Trunk-based development on `main`.**

Solo/small-team pre-1.0 — keep it simple:

- Commit directly to `main` for all routine work
- Use short-lived branches only for risky experiments or multi-day changes
- No `develop` branch — unnecessary overhead without a team

### Branch Naming (when needed)

```
feat/<scope>/<short-desc>     # Feature branches
fix/<scope>/<short-desc>      # Bug fixes
chore/<scope>/<short-desc>    # Maintenance
docs/<short-desc>             # Documentation
```

Scopes: `api`, `auth`, `config`, `core`, `cli`, `plugin-sdk`, `ci`, `docs`

### Post-1.0 Upgrade

When contributors join or after stable release:

- Enable branch protection on `main` (require CI to pass)
- Require PR reviews before merge
- Squash merge to keep history clean
- Add `CODEOWNERS` file

---

## Labels

### Package Labels

| Label | Color | Description |
| --- | --- | --- |
| `pkg:cli` | `#1d76db` | @gpc/cli |
| `pkg:core` | `#1d76db` | @gpc/core |
| `pkg:api` | `#1d76db` | @gpc/api |
| `pkg:auth` | `#1d76db` | @gpc/auth |
| `pkg:config` | `#1d76db` | @gpc/config |
| `pkg:plugin-sdk` | `#1d76db` | @gpc/plugin-sdk |
| `pkg:plugin-ci` | `#1d76db` | @gpc/plugin-ci |

### Type Labels

| Label | Color | Description |
| --- | --- | --- |
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or improvement |
| `docs` | `#0075ca` | Documentation only |
| `good first issue` | `#7057ff` | Good for newcomers |
| `help wanted` | `#008672` | Extra attention needed |
| `wontfix` | `#ffffff` | Will not be worked on |
| `duplicate` | `#cfd3d7` | Already exists |

### Priority Labels

| Label | Color | Description |
| --- | --- | --- |
| `p0:critical` | `#b60205` | Must fix immediately |
| `p1:high` | `#d93f0b` | Fix this release |
| `p2:medium` | `#fbca04` | Fix soon |
| `p3:low` | `#0e8a16` | Nice to have |

### Create All Labels

```bash
# Remove GitHub defaults (optional)
gh label list --json name -q '.[].name' | while read -r name; do
  gh label delete "$name" --yes
done

# Package labels
for pkg in cli core api auth config plugin-sdk plugin-ci; do
  gh label create "pkg:$pkg" --color "1d76db" --description "@gpc/$pkg"
done

# Type labels
gh label create "bug" --color "d73a4a" --description "Something isn't working"
gh label create "enhancement" --color "a2eeef" --description "New feature or improvement"
gh label create "docs" --color "0075ca" --description "Documentation only"
gh label create "good first issue" --color "7057ff" --description "Good for newcomers"
gh label create "help wanted" --color "008672" --description "Extra attention needed"
gh label create "wontfix" --color "ffffff" --description "Will not be worked on"
gh label create "duplicate" --color "cfd3d7" --description "Already exists"

# Priority labels
gh label create "p0:critical" --color "b60205" --description "Must fix immediately"
gh label create "p1:high" --color "d93f0b" --description "Fix this release"
gh label create "p2:medium" --color "fbca04" --description "Fix soon"
gh label create "p3:low" --color "0e8a16" --description "Nice to have"
```

---

## Issue Templates

### Bug Report

File: `.github/ISSUE_TEMPLATE/bug_report.yml`

- GPC version, Node.js version, OS
- Command run (with `--verbose` output)
- Expected vs actual behavior
- Service account or OAuth auth method

### Feature Request

File: `.github/ISSUE_TEMPLATE/feature_request.yml`

- Use case description
- Proposed command/flag syntax
- Which package it affects

### Config

File: `.github/ISSUE_TEMPLATE/config.yml`

- Disable blank issues (direct to discussions or templates)
- Link to docs for FAQ/support

### Create Issues via `gh`

```bash
# Bug report with labels
gh issue create \
  --title "fix(api): retry logic fails on 503" \
  --label "bug,pkg:api,p1:high" \
  --body "Steps to reproduce..."

# Feature request
gh issue create \
  --title "feat(cli): add gpc export command" \
  --label "enhancement,pkg:cli,p2:medium"

# Batch create issues from a file
cat issues.txt | while IFS='|' read -r title labels; do
  gh issue create --title "$title" --label "$labels"
done
```

---

## GitHub Actions (CI/CD)

### CI Pipeline (`ci.yml`)

Runs on: push to `main`, pull requests

```yaml
# Steps:
# 1. pnpm install (cached)
# 2. pnpm lint
# 3. pnpm build (all packages in dependency order)
# 4. pnpm test (354+ tests across 7 packages)
# Matrix: Node.js 20.x, 22.x
```

### Release Pipeline (`release.yml`)

Runs on: push to `main` (when changesets exist)

```yaml
# Steps:
# 1. Changesets bot creates "Version Packages" PR
# 2. Merge version PR triggers publish
# 3. Each changed package published to npm
# 4. GitHub Release created with changelog
```

### Monitor CI via `gh`

```bash
# Check recent workflow runs
gh run list --workflow ci.yml --limit 5

# View a failed run's logs
gh run view <run-id> --log-failed

# Re-run a failed workflow
gh run rerun <run-id> --failed

# Watch a run in real-time
gh run watch <run-id>

# Download workflow artifacts
gh run download <run-id>
```

### Future Additions

- [ ] CodeQL security scanning
- [ ] Dependency review on PRs (license + vulnerability check)
- [ ] Bundle size tracking

---

## Releases

### Versioning

- Pre-1.0: `0.PHASE.PATCH` (e.g., `0.8.0` = Phase 8)
- Post-1.0: standard semver
- All packages versioned independently via Changesets

### Release Workflow

```bash
# 1. Create changeset
pnpm changeset

# 2. Commit and push
git add . && git commit -m "chore: add changeset"
git push

# 3. Changesets bot opens "Version Packages" PR
gh pr list --search "Version Packages"

# 4. Review and merge
gh pr merge <pr-number> --squash

# 5. Verify the release was published
gh release list --limit 5
gh release view v0.8.0
```

### Manual Release (when needed)

```bash
# Create release with auto-generated notes from commits
gh release create v0.8.0 --generate-notes

# Create release with custom notes
gh release create v0.8.0 --notes "$(cat <<'EOF'
## Highlights
- Plugin system with lifecycle hooks
- CI/CD plugin for GitHub Actions

## Breaking Changes
None

## Full Changelog
https://github.com/yasserstudio/gpc/compare/v0.7.0...v0.8.0
EOF
)"

# Create a draft release for review
gh release create v0.8.0 --draft --generate-notes

# Attach binary assets (future)
gh release upload v0.8.0 dist/gpc-linux-x64 dist/gpc-darwin-arm64
```

### GitHub Releases

- Auto-generated from changeset summaries
- Tag format: `@gpc/core@0.8.0` (standard monorepo convention)
- Attach notable highlights in release notes

---

## Repository Settings

### Configure via `gh`

```bash
# General settings
gh repo edit \
  --enable-issues \
  --disable-wiki \
  --delete-branch-on-merge \
  --default-branch main

# Description and topics
gh repo edit \
  --description "Ship Android apps from your terminal" \
  --add-topic "google-play,android,cli,typescript,developer-tools"

# Enable security features (requires web UI or API)
gh api repos/{owner}/{repo} -X PATCH \
  -f security_and_analysis[secret_scanning][status]=enabled \
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled
```

### General

- Default branch: `main`
- Features: Issues (on), Discussions (off for now), Wiki (off — use `docs/`)
- Merge options: Squash merge preferred, allow merge commits
- Auto-delete head branches after merge

### Security

- Dependabot alerts: enabled
- Dependabot version updates: enabled for production deps
- Secret scanning: enabled
- Never commit service account keys or credentials

### Branch Protection (post-1.0)

```bash
# Enable branch protection (when ready)
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
```

- Require status checks (CI) before merge
- Require linear history
- No force pushes to `main`
- Require signed commits (optional)

---

## Monitoring & Triage

### Daily Check

```bash
# Open bugs by priority
gh issue list --label "bug" --state open

# Stale issues (no activity in 30 days)
gh issue list --search "is:open updated:<$(date -v-30d +%Y-%m-%d)"

# Recent activity
gh issue list --state all --limit 10 --search "sort:updated-desc"
```

### PR Management

```bash
# Open PRs needing review
gh pr list --search "is:open review:required"

# Merge a PR with squash
gh pr merge <number> --squash --delete-branch

# Check PR CI status
gh pr checks <number>
```

---

## Setup Scripts

### Full Repo Setup (one-time)

```bash
#!/bin/bash
# scripts/github-setup.sh — Run once to configure the repo

set -euo pipefail

REPO="yasserstudio/gpc"

echo "Configuring repo settings..."
gh repo edit "$REPO" \
  --enable-issues \
  --disable-wiki \
  --delete-branch-on-merge \
  --description "Ship Android apps from your terminal" \
  --add-topic "google-play,android,cli,typescript,developer-tools"

echo "Creating labels..."
# (paste label creation commands from Labels section above)

echo "Done. Verify at https://github.com/$REPO"
```

---

## README Strategy

Keep minimal until ready for public launch (Phase 9 / v1.0.0):

- One-line description
- Install + quick start
- Link to `docs/` for details
- "Pre-release, API may change" badge

Full README with badges, examples, and feature matrix at v1.0.0.

---

## AI Co-Authorship

**Never credit AI as a collaborator or co-author in the GitHub repo.** This includes:

- No `Co-Authored-By` lines referencing AI in commits
- No "generated by" or "written with AI" attributions
- No AI tool names in commit messages, PR descriptions, or issue comments

Development tooling files (CLAUDE.md, AGENTS.md) are fine — they're developer config, not attribution.

---

## Homebrew Tap

GPC is distributed via a Homebrew tap hosted at `yasserstudio/homebrew-tap`.

### Setup

```bash
# Create the tap repo
brew tap-new yasserstudio/homebrew-tap
gh repo create yasserstudio/homebrew-tap --push --public \
  --source "$(brew --repository yasserstudio/homebrew-tap)"
```

### Formula

The formula (`Formula/gpc.rb`) downloads pre-built binaries from GitHub Releases — the same assets the `binary.yml` workflow uploads. Platform-specific URLs use `on_macos`/`on_linux` + `on_arm`/`on_intel` blocks.

### Update Process

On each GitHub Release:
1. `binary.yml` builds and uploads platform binaries + `checksums.txt`
2. A workflow in `homebrew-tap` updates the formula version and SHA256 values
3. Users get the update on next `brew update && brew upgrade`

### User Install

```bash
brew install yasserstudio/tap/gpc
```

---

## Community (post-1.0)

- `CONTRIBUTING.md` — setup, PR process, code style
- `CODE_OF_CONDUCT.md` — Contributor Covenant
- GitHub Discussions — Q&A, feature ideas
- `SECURITY.md` — vulnerability reporting process
