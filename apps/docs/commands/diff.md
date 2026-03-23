---
outline: deep
---

<CommandHeader
  name="gpc diff"
  description="Preview current release state and pending changes — read-only, no mutations."
  usage="gpc diff [options]"
  :badges="['--json', 'read-only']"
/>

## Overview

`gpc diff` shows what's live on Google Play right now and what would change if you publish or promote. No edits are committed — it's purely a read-only preview.

Use it before `gpc publish` or `gpc releases promote` to verify you're about to change what you think you're changing.

## Synopsis

```bash
gpc diff [options]
```

## Options

| Option              | Description                                        | Default |
| ------------------- | -------------------------------------------------- | ------- |
| `--from <track>`    | Compare releases from this track                   | —       |
| `--to <track>`      | Compare releases to this track                     | —       |
| `--metadata <dir>`  | Compare local metadata directory vs remote listings | —       |

## Examples

```bash
# Release status across all tracks
gpc diff

# Compare two tracks side by side
gpc diff --from internal --to production

# Compare local metadata vs what's live on Play
gpc diff --metadata fastlane/metadata/android

# JSON output for scripting
gpc diff --output json

# Combine: releases + metadata diff
gpc diff --from beta --to production --metadata ./metadata
```

## Output

### Default (release status)

Shows current release status across all tracks:

```
GPC Diff — Current State

Releases
  production     completed    v142
  beta           inProgress   v143  10%
  internal       draft        v144
```

### Track-to-track diff (`--from`/`--to`)

Shows field-by-field differences between two tracks:

```
Track Diff: internal → production
  versionCode      144 → 142
  status           draft → completed
  userFraction     (empty) → (empty)
```

### Metadata diff (`--metadata`)

Shows which listing fields differ between your local files and what's live:

```
Metadata Diff (local vs remote)
  ~ en-US/title: changed
  + fr-FR/shortDescription: added
  - ja-JP/fullDescription: removed
```

## CI Usage

```bash
# Verify state before promoting
gpc diff --from beta --to production --output json | jq '.trackDiff.diffs | length'
# 0 = tracks match, >0 = differences exist
```
