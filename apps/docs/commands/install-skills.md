---
outline: deep
---

<CommandHeader
  name="gpc install-skills"
  description="Install GPC agent skills for AI-assisted Google Play workflows."
  usage="gpc install-skills [options]"
  :badges="['--json']"
/>

## Synopsis

```bash
gpc install-skills [options]
```

## Options

| Option          | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `-l, --list`    | List available skills without installing                      |
| `-y, --yes`     | Skip confirmation prompts                                     |
| `-g, --global`  | Install skills globally (user-level) instead of project-level |
| `--all`         | Install all skills to all agents without prompts              |
| `--repo <repo>` | Custom skills repository (default: `yasserstudio/gpc-skills`) |

## Examples

### Interactive installation (recommended)

```bash
gpc install-skills
```

The wizard walks you through:

1. Cloning the skills repository
2. Selecting which skills to install (13 available)
3. Choosing target agents (Claude Code, Cursor, Copilot, etc.)
4. Selecting installation scope (global or project)
5. Security risk assessment review
6. Confirmation and installation

### List available skills

```bash
gpc install-skills --list
```

### Install everything, no prompts

```bash
gpc install-skills --all
```

### Global install with auto-confirm

```bash
gpc install-skills -g -y
```

## Available Skills

| Skill                    | Description                             |
| ------------------------ | --------------------------------------- |
| `gpc-setup`              | Auth, config, profiles, `gpc doctor`    |
| `gpc-release-flow`       | Upload, releases, rollouts, promote     |
| `gpc-metadata-sync`      | Store listings, images, Fastlane compat |
| `gpc-vitals-monitoring`  | Crashes, ANR, reviews, reports          |
| `gpc-ci-integration`     | GitHub Actions, GitLab CI, exit codes   |
| `gpc-monetization`       | Subscriptions, IAP, offers, pricing     |
| `gpc-user-management`    | Users, permissions, testers             |
| `gpc-migrate-fastlane`   | Fastlane-to-GPC migration               |
| `gpc-plugin-development` | Plugin SDK, hooks, permissions          |
| `gpc-troubleshooting`    | Exit codes, error catalog, debug        |
| `gpc-sdk-usage`          | @gpc-cli/api and @gpc-cli/auth as SDK   |
| `gpc-multi-app`          | Multiple apps, profiles, batch ops      |
| `gpc-security`           | Credential storage, rotation, audit     |

## How Skills Work

Skills are structured guides installed to `.agents/skills/` that teach AI coding assistants how to use GPC. They are not plugins — they don't modify CLI behavior. Instead, they provide context and procedures that AI assistants follow when helping you with Google Play tasks.

Each skill contains:

- `SKILL.md` — instructions and procedures
- `references/` — detailed documentation for specific topics
- `scripts/` — detection scripts for environment checks
- `evals/` — test cases for skill quality

## Related

- [Agent Skills guide](../advanced/skills) — full documentation on skills
- [Plugin Development](../advanced/plugins) — extend GPC with plugins
- [gpc-skills repository](https://github.com/yasserstudio/gpc-skills)
