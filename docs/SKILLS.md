# Agent Skills

GPC includes agent skills for [Claude Code](https://claude.com/claude-code) — AI-powered workflows that guide you through common Google Play operations.

---

## What Are Skills?

Skills are structured documentation that teach AI assistants how to use GPC. When you use Claude Code and ask about Google Play tasks, it reads the relevant skill and walks you through the workflow step-by-step.

**Example:** Ask Claude Code "upload my AAB to the Play Store" — it reads the `gpc-release-flow` skill and runs the right commands for you.

---

## Available Skills

| Skill | What It Covers |
|-------|---------------|
| **gpc-setup** | Install GPC, authenticate (service account, OAuth, ADC), configure defaults, run `gpc doctor` |
| **gpc-release-flow** | Upload AAB/APK, create releases, promote between tracks, manage staged rollouts |
| **gpc-metadata-sync** | Pull/push store listings, manage screenshots, migrate from Fastlane metadata format |
| **gpc-vitals-monitoring** | Monitor crash rates, ANR, startup time, respond to reviews, download reports |
| **gpc-ci-integration** | Set up GPC in GitHub Actions, GitLab CI, Bitbucket, CircleCI with JSON output and exit codes |
| **gpc-monetization** | Subscriptions, IAP, base plans, offers, purchases, pricing, regional conversion |
| **gpc-user-management** | Developer account users, permissions, grants, testers, CSV import |
| **gpc-migrate-fastlane** | Migrate from Fastlane supply — command mapping, CI migration, coexistence |
| **gpc-plugin-development** | Build GPC plugins — lifecycle hooks, permissions, custom commands |
| **gpc-troubleshooting** | Debug GPC errors — exit codes, error catalog, verbose output, common fixes |
| **gpc-sdk-usage** | Use @gpc/api and @gpc/auth as standalone TypeScript SDK for programmatic access |
| **gpc-multi-app** | Manage multiple apps — profiles, batch operations, monorepo patterns, CI matrix |
| **gpc-security** | Credential storage, key rotation, audit logging, incident response, CI security |

---

## Using Skills with Claude Code

Skills are automatically available when you work in the GPC repository with Claude Code. No extra setup needed.

### Example Prompts

```
"Set up GPC with my service account key"
→ Claude reads gpc-setup skill

"Upload app-release.aab to beta track"
→ Claude reads gpc-release-flow skill

"Sync my store listings from the metadata/ directory"
→ Claude reads gpc-metadata-sync skill

"Check if crash rate is safe to promote to production"
→ Claude reads gpc-vitals-monitoring skill

"Set up GPC in our GitHub Actions workflow"
→ Claude reads gpc-ci-integration skill

"Create a subscription with a free trial"
→ Claude reads gpc-monetization skill

"Invite a new team member to our Play Console"
→ Claude reads gpc-user-management skill

"Migrate from Fastlane to GPC"
→ Claude reads gpc-migrate-fastlane skill

"Build a plugin that sends Slack notifications"
→ Claude reads gpc-plugin-development skill

"Why is gpc failing with exit code 4?"
→ Claude reads gpc-troubleshooting skill

"Build a backend that verifies purchases with @gpc/api"
→ Claude reads gpc-sdk-usage skill

"Deploy to 3 white-label apps at once"
→ Claude reads gpc-multi-app skill

"How do I rotate our service account key?"
→ Claude reads gpc-security skill
```

---

## Skill Structure

Each skill follows a consistent format:

```
gpc-<name>/
├── SKILL.md              # Main guide — procedure, verification, failure modes
└── references/           # Deep-dive docs on specific topics
    ├── topic-a.md
    └── topic-b.md
```

### Reference Docs

| Skill | References |
|-------|-----------|
| gpc-setup | `service-account.md` · `configuration.md` · `troubleshooting.md` · `oauth-flow.md` |
| gpc-release-flow | `upload-lifecycle.md` · `rollout-strategies.md` · `troubleshooting.md` · `release-notes.md` |
| gpc-metadata-sync | `directory-structure.md` · `fastlane-migration.md` · `image-requirements.md` |
| gpc-vitals-monitoring | `ci-gating.md` · `review-management.md` |
| gpc-ci-integration | `github-actions.md` · `troubleshooting.md` · `gitlab-ci.md` · `bitbucket-pipelines.md` |
| gpc-monetization | `subscription-schema.md` · `iap-schema.md` · `purchase-verification.md` |
| gpc-user-management | `permissions.md` · `tester-workflows.md` |
| gpc-migrate-fastlane | `command-mapping.md` · `ci-migration.md` |
| gpc-plugin-development | `hooks-reference.md` · `permissions-system.md` |
| gpc-troubleshooting | `exit-codes.md` · `error-catalog.md` |
| gpc-sdk-usage | `auth-patterns.md` · `api-reference.md` |
| gpc-multi-app | `profile-patterns.md` · `ci-multi-app.md` |
| gpc-security | `credential-storage.md` · `key-rotation.md` |

---

## Installation

### With GPC (included)

Skills are bundled in the GPC repository at `.agents/skills/gpc-*`. If you're working in the repo, Claude Code finds them automatically.

### Standalone

```bash
# Clone skills into your project
git clone https://github.com/yasserstudio/gpc.git /tmp/gpc
cp -r /tmp/gpc/.agents/skills/gpc-* .agents/skills/
```

---

## Skill Coverage Map

| GPC Command | Covered By |
|-------------|-----------|
| `gpc auth login` | gpc-setup |
| `gpc config init` | gpc-setup |
| `gpc doctor` | gpc-setup |
| `gpc releases upload` | gpc-release-flow |
| `gpc publish` | gpc-release-flow |
| `gpc releases promote` | gpc-release-flow |
| `gpc releases rollout *` | gpc-release-flow |
| `gpc validate` | gpc-release-flow |
| `gpc listings pull/push` | gpc-metadata-sync |
| `gpc listings images *` | gpc-metadata-sync |
| `gpc vitals *` | gpc-vitals-monitoring |
| `gpc reviews *` | gpc-vitals-monitoring |
| `gpc reports *` | gpc-vitals-monitoring |
| CI/CD workflows | gpc-ci-integration |

| `gpc subscriptions *` | gpc-monetization |
| `gpc iap *` | gpc-monetization |
| `gpc purchases *` | gpc-monetization |
| `gpc pricing *` | gpc-monetization |
| `gpc users *` | gpc-user-management |
| `gpc testers *` | gpc-user-management |

| `gpc plugins *` | gpc-plugin-development |
| Fastlane migration | gpc-migrate-fastlane |
| Error debugging | gpc-troubleshooting |
| Programmatic SDK usage | gpc-sdk-usage |
| Multi-app management | gpc-multi-app |
| Credential security | gpc-security |

All GPC commands and workflows are covered by skills.

---

## Changelog

### v0.12.0 (2026-03-09)

- Added **gpc-sdk-usage** skill — @gpc/api and @gpc/auth as standalone TypeScript SDK
- Added **gpc-multi-app** skill — profiles, batch operations, monorepo patterns
- Added **gpc-security** skill — credential storage, key rotation, audit logging
- 13 skills total, all phases complete

### v0.11.0 (2026-03-09)

- Added **gpc-migrate-fastlane** skill — Fastlane-to-GPC migration with command mapping
- Added **gpc-plugin-development** skill — plugin SDK, hooks, permissions, custom commands
- Added **gpc-troubleshooting** skill — exit codes, error catalog, debug mode

### v0.10.0 (2026-03-09)

- Added **gpc-monetization** skill — subscriptions, IAP, purchases, pricing
- Added **gpc-user-management** skill — users, permissions, testers
- Added 5 new reference docs to existing skills (release notes, image specs, GitLab CI, Bitbucket, OAuth)

### v0.9.4 (2026-03-09)

- Improved skill descriptions for better AI triggering
- Added eval test cases for all skills
- Added `detect_gpc.mjs` detection script to all skills

### v0.9.3 (2026-03-09)

- Initial release: 5 skills, 12 reference docs
- Covers setup, releases, metadata, vitals, and CI/CD
