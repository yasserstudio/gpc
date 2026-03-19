# GPC - Agent Skills

This project uses [agent skills](https://github.com/anthropics/skills) for AI-assisted development.

## Installed Skills

### Marketing Skills (32 skills)

Installed via `npx skills add coreyhaines31/marketingskills`

Used for branding, content strategy, launch planning, and growth.

### GPC Skills (15 skills)

Installed via `gpc install-skills` or `npx skills add yasserstudio/gpc-skills`

Reference skills for Google Play Console operations. See CLAUDE.md for the full skill table.

## For Contributors

Skills are installed per-machine and gitignored (`.agents/`, `.claude/skills`, `.windsurf/skills`).

To install skills locally:

```bash
npx skills add coreyhaines31/marketingskills
npx skills add yasserstudio/gpc-skills
```
