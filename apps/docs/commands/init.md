---
outline: deep
---

<CommandHeader
  name="gpc init"
  description="Scaffold project config, metadata directory, and CI templates in one command."
  usage="gpc init [options]"
  :badges="['interactive', '--ci']"
/>

## Overview

`gpc init` creates the files you need to start using GPC in a project. It generates config files, a metadata directory for store listings, and optionally a CI template — all non-destructive by default.

## Synopsis

```bash
gpc init [options]
```

## Options

| Option          | Description                                  | Default              |
| --------------- | -------------------------------------------- | -------------------- |
| `--app <name>`  | Android package name (e.g. com.example.app)  | prompted interactively |
| `--ci <platform>` | Generate CI template: `github` or `gitlab` | prompted interactively |
| `--force`       | Overwrite existing files                     | skip existing        |

## What It Creates

```
.gpcrc.json                         # GPC config (package name, output format)
.preflightrc.json                   # Preflight scanner config
metadata/android/en-US/
├── title.txt                       # App title (max 30 chars)
├── short_description.txt           # Short description (max 80 chars)
├── full_description.txt            # Full description (max 4000 chars)
├── video.txt                       # Promo video URL
└── images/phoneScreenshots/.gitkeep
```

With `--ci github`:
```
.github/workflows/gpc-release.yml  # Build → preflight → upload pipeline
```

With `--ci gitlab`:
```
.gitlab-ci-gpc.yml                 # Build → preflight → release stages
```

## Examples

```bash
# Interactive — prompts for package name and CI platform
gpc init

# Non-interactive
gpc init --app com.example.myapp

# With GitHub Actions workflow
gpc init --app com.example.myapp --ci github

# Overwrite existing files
gpc init --app com.example.myapp --force
```

## Behavior

- **Non-destructive** — existing files are skipped. Use `--force` to overwrite.
- **Interactive** — when run in a terminal, prompts for package name and CI platform. In CI or with `--no-interactive`, uses defaults.
- Subsequent runs show which files were created and which were skipped.

## Next Steps

After running `gpc init`:

1. `gpc auth login --service-account path/to/key.json`
2. `gpc doctor`
3. `gpc status`
