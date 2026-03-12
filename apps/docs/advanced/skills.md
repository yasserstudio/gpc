---
outline: deep
---

# Agent Skills

Agent skills are structured guides that teach AI coding assistants how to use GPC effectively. Each skill contains documentation, reference material, and examples for a specific workflow area.

## Compatible Assistants

Agent skills work with any AI coding assistant that supports skill files:

- Claude Code
- Cursor
- GitHub Copilot
- Windsurf
- Other AI assistants that read project-level instruction files

## Installation

Install the GPC skills into your project:

```bash
npx skills add yasserstudio/gpc-skills
```

Skills are installed to `.agents/skills/` in your project root and automatically discovered by compatible assistants.

## Available Skills

GPC ships with 13 agent skills covering every workflow:

| Skill | Description |
|-------|-------------|
| `gpc-setup` | Auth, config, profiles, `gpc doctor` |
| `gpc-release-flow` | Upload AAB, releases, rollouts, promote |
| `gpc-metadata-sync` | Store listings, images, Fastlane metadata compat |
| `gpc-vitals-monitoring` | Crashes, ANR, vitals thresholds, reviews, reports |
| `gpc-ci-integration` | GitHub Actions, GitLab CI, env vars, JSON output, exit codes |
| `gpc-monetization` | Subscriptions, IAP, base plans, offers, purchases, pricing |
| `gpc-user-management` | Users, permissions, grants, testers, CSV import |
| `gpc-migrate-fastlane` | Fastlane-to-GPC migration, command mapping, CI migration |
| `gpc-plugin-development` | Plugin SDK, lifecycle hooks, permissions, custom commands |
| `gpc-troubleshooting` | Exit codes, error catalog, debug mode, common fixes |
| `gpc-sdk-usage` | `@gpc-cli/api` and `@gpc-cli/auth` as standalone TypeScript SDK |
| `gpc-multi-app` | Multiple apps, profiles, batch operations, monorepo patterns |
| `gpc-security` | Credential storage, key rotation, audit logging, incident response |

## Skill Selection Guide

Not sure which skill to use? Find your task below:

| I want to... | Skill |
|--------------|-------|
| Set up authentication or run `gpc doctor` | `gpc-setup` |
| Upload an AAB or manage releases | `gpc-release-flow` |
| Update store listings or screenshots | `gpc-metadata-sync` |
| Monitor crash rates or ANR | `gpc-vitals-monitoring` |
| Add GPC to GitHub Actions or GitLab CI | `gpc-ci-integration` |
| Manage subscriptions or in-app purchases | `gpc-monetization` |
| Invite users or manage testers | `gpc-user-management` |
| Migrate from Fastlane supply | `gpc-migrate-fastlane` |
| Build a GPC plugin | `gpc-plugin-development` |
| Debug errors or fix common issues | `gpc-troubleshooting` |
| Use GPC packages as a TypeScript SDK | `gpc-sdk-usage` |
| Manage multiple apps with profiles | `gpc-multi-app` |
| Audit credentials or rotate keys | `gpc-security` |

## Skill Structure

Each skill follows a consistent structure:

```
gpc-<name>/
  SKILL.md        — Main skill documentation and procedures
  references/     — Supporting reference material (API docs, schemas)
  evals/          — Test cases for validating skill behavior
  scripts/        — Automation scripts used by the skill
```

The `SKILL.md` file is the entry point. AI assistants read this file to understand the workflow, available commands, common patterns, and verification steps.

## Updating Skills

To update to the latest version of all installed skills:

```bash
cd .agents/skills && git pull
```

Or reinstall from scratch:

```bash
npx skills add yasserstudio/gpc-skills
```

## Source Repository

Skills are maintained at [github.com/yasserstudio/gpc-skills](https://github.com/yasserstudio/gpc-skills). Contributions and new skill ideas are welcome.
