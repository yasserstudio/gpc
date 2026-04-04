---
outline: deep
---

<CommandHeader
  name="gpc changelog"
  description="Show release history from GitHub."
  usage="gpc changelog [options]"
  :badges="['--json', 'no auth required']"
/>

## Overview

`gpc changelog` fetches release notes from GitHub and displays them in your terminal. No authentication required — it uses the public GitHub Releases API.

## Synopsis

```bash
gpc changelog [options]
```

## Options

| Option              | Description                               | Default |
| ------------------- | ----------------------------------------- | ------- |
| `-n, --limit <n>`   | Number of releases to show                | `5`     |
| `--tag <tag>`       | Show a specific version (e.g., `v0.9.43`) | —       |
| `--all`             | Show all releases                         | —       |
| `-o, --output json` | JSON output                               | table   |

## Examples

### List recent releases

```bash
gpc changelog
```

```
VERSION      DATE         TITLE
─────────────────────────────────────────────
v0.9.43      2026-03-24   Upload Fix & Enhanced Error Messages
v0.9.42      2026-03-24   Resumable Upload Fix
v0.9.41      2026-03-23   Bug Fixes & Code Quality
v0.9.40      2026-03-23   Bug Fixes
v0.9.39      2026-03-23   Preflight Scanner, New Commands & Status Improvements
```

### Show details for a specific version

```bash
gpc changelog --tag v0.9.43
```

```
v0.9.43 — Upload Fix & Enhanced Error Messages
Released: 2026-03-24

fix

Resumable uploads now work. Node.js fetch was following HTTP 308
as a redirect, breaking Google's "Resume Incomplete" protocol.
Added X-GUploader-No-308 header (same fix as Google's Go SDK).

feat

12 smart error messages for common API failures — each with
actionable fix commands.

Full notes: https://github.com/yasserstudio/gpc/releases/tag/v0.9.43
```

### JSON output for CI

```bash
gpc changelog --limit 3 --output json
```

### Show all releases

```bash
gpc changelog --all
```

## Notes

- Uses the public GitHub Releases API (no auth needed)
- Rate limit: 60 requests per hour (unauthenticated)
- Falls back to a docs URL link on network error
- Only shows releases with `v*` tags (matches GPC's versioning)
