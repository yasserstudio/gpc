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

Install the GPC skills using the built-in wizard:

```bash
gpc install-skills
```

The wizard lets you pick which skills to install and which AI agents to configure. You can also install directly:

```bash
npx skills add yasserstudio/gpc-skills
```

Skills are installed to `.agents/skills/` in your project root and automatically discovered by compatible assistants.

## Available Skills

GPC ships with 16 agent skills covering every workflow:

| Skill                    | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `gpc-setup`              | Auth, config, profiles, `gpc doctor`                               |
| `gpc-onboarding`         | First-run setup, `gpc quickstart`, `gpc init`, interactive wizard  |
| `gpc-release-flow`       | Upload AAB/APK, draft releases, rollouts, promote, rejected app handling, native debug symbols, `gpc diff`, `gpc changelog` |
| `gpc-train`              | Automated staged rollout pipeline with time gates and vitals gates |
| `gpc-preflight`          | Offline AAB/APK compliance scanner (9 scanners), `.preflightrc.json` |
| `gpc-metadata-sync`      | Store listings, images, Fastlane metadata compat                   |
| `gpc-vitals-monitoring`  | Crashes, ANR, LMK, vitals thresholds, reviews (auto-paginate), reports |
| `gpc-ci-integration`     | GitHub Actions, GitLab CI, env vars, JSON output, exit codes       |
| `gpc-monetization`       | Subscriptions, IAP, RTDN notifications, voided purchases, pricing, upsert, pagination |
| `gpc-user-management`    | Users, permissions, grants, testers, CSV import                    |
| `gpc-migrate-fastlane`   | Fastlane-to-GPC migration, command mapping, CI migration           |
| `gpc-plugin-development` | Plugin SDK, lifecycle hooks, permissions, custom commands           |
| `gpc-troubleshooting`    | Exit codes, error catalog (42+ codes), debug mode, common fixes    |
| `gpc-sdk-usage`          | `@gpc-cli/api` and `@gpc-cli/auth` as standalone TypeScript SDK (209 endpoints), 6-bucket rate limiter |
| `gpc-multi-app`          | Multiple apps, profiles, batch operations, monorepo patterns       |
| `gpc-security`           | Credential storage, key rotation, audit logging, incident response |

## Skill Selection Guide

Not sure which skill to use? Find your task below:

| I want to...                                        | Skill                    |
| --------------------------------------------------- | ------------------------ |
| Get started with GPC for the first time             | `gpc-onboarding`         |
| Set up authentication or run `gpc doctor`           | `gpc-setup`              |
| Upload an AAB or APK, or manage releases             | `gpc-release-flow`       |
| Create a draft release for Play Console review       | `gpc-release-flow`       |
| Upload to a rejected app                             | `gpc-release-flow`       |
| Upload native debug symbols (NDK)                    | `gpc-release-flow`       |
| Target a device tier config at upload time            | `gpc-release-flow`       |
| Scan AAB/APK for policy violations before upload     | `gpc-preflight`          |
| Automate staged rollouts with gates                 | `gpc-train`              |
| Update store listings or screenshots                | `gpc-metadata-sync`      |
| Monitor crash rates or ANR                          | `gpc-vitals-monitoring`  |
| Fetch all reviews with auto-pagination              | `gpc-vitals-monitoring`  |
| Add GPC to GitHub Actions or GitLab CI              | `gpc-ci-integration`     |
| Manage subscriptions or in-app purchases            | `gpc-monetization`       |
| Upsert a subscription or product (create if missing) | `gpc-monetization`       |
| Decode RTDN Pub/Sub notifications                   | `gpc-monetization`       |
| Invite users, manage testers, or control app grants | `gpc-user-management`    |
| Migrate from Fastlane supply                        | `gpc-migrate-fastlane`   |
| Build a GPC plugin                                  | `gpc-plugin-development` |
| Debug errors or fix common issues                   | `gpc-troubleshooting`    |
| Fix "changes not sent for review" error              | `gpc-troubleshooting`    |
| Prevent accidental review cancellation in CI         | `gpc-ci-integration`     |
| Use GPC packages as a TypeScript SDK                | `gpc-sdk-usage`          |
| Manage multiple apps with profiles                  | `gpc-multi-app`          |
| Audit credentials or rotate keys                    | `gpc-security`           |
| Configure API rate limiting                         | `gpc-sdk-usage`          |

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
gpc install-skills
```

## Source Repository

Skills are maintained at [github.com/yasserstudio/gpc-skills](https://github.com/yasserstudio/gpc-skills). Contributions and new skill ideas are welcome.
