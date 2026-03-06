# GPC - Agent Skills

This project uses [agent skills](https://github.com/anthropics/skills) for AI-assisted development.

## Installed Skills

### Marketing Skills (32 skills)

Installed via `npx skills add coreyhaines31/marketingskills`

Used for branding, content strategy, launch planning, and growth. See `design/marketing/` for outputs.

### Google Play CLI Skills

Installed via `npx skills add tamtom/gplay-cli-skills`

Reference skills for Google Play Console operations. See global CLAUDE.md for details.

## For Contributors

Skills are installed per-machine and gitignored (`.agents/`, `.claude/skills`, `.windsurf/skills`).

To install skills locally:

```bash
npx skills add coreyhaines31/marketingskills
npx skills add tamtom/gplay-cli-skills
```
