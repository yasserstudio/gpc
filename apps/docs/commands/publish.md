---
outline: deep
---

<CommandHeader
  name="gpc publish"
  description="High-level workflow command — upload, assign track, and commit in one step. Use gpc validate to dry-run without uploading."
  usage="gpc publish <file> [options]"
  :badges="['--json', '--dry-run', '--track', '--rollout']"
/>

## Commands

| Command                         | Description                               |
| ------------------------------- | ----------------------------------------- |
| [`gpc publish`](#gpc-publish)   | Validate, upload, and release in one step |
| [`gpc validate`](#gpc-validate) | Pre-submission validation checks          |

::: tip
`gpc status` — unified app health snapshot (releases + vitals + reviews) — has its own page: [status](/commands/status).
:::

## `gpc publish`

End-to-end workflow: validates the bundle, uploads it to a track, sets release notes, and commits the edit.

### Synopsis

```bash
gpc publish <file> [options]
```

### Options

| Flag                            | Short | Type     | Default    | Description                                                                                |
| ------------------------------- | ----- | -------- | ---------- | ------------------------------------------------------------------------------------------ |
| `--track`                       |       | `string` | `internal` | Target track (`internal`, `alpha`, `beta`, `production`, or custom)                        |
| `--rollout`                     |       | `number` |            | Staged rollout percentage (1-100)                                                          |
| `--notes`                       |       | `string` |            | Release notes text (en-US)                                                                 |
| `--notes-dir`                   |       | `string` |            | Directory with per-language release notes (`<dir>/<lang>.txt`)                             |
| `--name`                        |       | `string` |            | Release name                                                                               |
| `--mapping`                     |       | `string` |            | Path to ProGuard/R8 mapping file for deobfuscation                                         |
| `--mapping-type`                |       | `string` | `proguard` | Deobfuscation file type: `proguard` or `nativeCode`                                        |
| `--device-tier-config`          |       | `string` |            | Device tier config ID (or `LATEST`) for targeted delivery                                  |
| `--retry-log`                   |       | `string` |            | Write retry log entries to file (JSONL)                                                    |
| `--changes-not-sent-for-review` |       | flag     |            | Commit without sending for review (required for [rejected apps](./releases#rejected-apps)) |
| `--error-if-in-review`          |       | flag     |            | Fail if changes are already in review instead of cancelling them                           |

::: warning
`--notes` and `--notes-dir` are mutually exclusive. Providing both causes exit code 2.
:::

### Example

Upload an AAB to the beta track with release notes:

```bash
gpc publish app-release.aab \
  --app com.example.myapp \
  --track beta \
  --notes "Bug fixes and performance improvements" \
  --mapping app/build/outputs/mapping/release/mapping.txt
```

Upload with multi-language release notes:

```bash
gpc publish app-release.aab \
  --app com.example.myapp \
  --track production \
  --rollout 10 \
  --notes-dir ./release-notes/
```

The `release-notes/` directory structure:

```
release-notes/
  en-US.txt
  ja-JP.txt
  de-DE.txt
```

Preview what would happen without executing:

```bash
gpc publish app-release.aab --track beta --dry-run
```

```json
{
  "dryRun": true,
  "command": "publish",
  "action": "publish",
  "target": "app-release.aab",
  "details": {
    "track": "beta"
  }
}
```

Interactive mode (when no `--no-interactive` flag is set in a TTY):

```bash
gpc publish app-release.aab
# Prompts: Select track, rollout percentage, release notes
```

---

## `gpc validate`

Run pre-submission validation checks on a bundle file without uploading.

### Synopsis

```bash
gpc validate <file> [options]
```

### Options

| Flag          | Short | Type     | Default | Description                               |
| ------------- | ----- | -------- | ------- | ----------------------------------------- |
| `--track`     |       | `string` |         | Target track to validate against          |
| `--mapping`   |       | `string` |         | Path to ProGuard/R8 mapping file          |
| `--notes`     |       | `string` |         | Release notes text (en-US)                |
| `--notes-dir` |       | `string` |         | Directory with per-language release notes |

### Example

Validate a bundle before uploading:

```bash
gpc validate app-release.aab
```

```
check        passed  message
-----------  ------  --------------------------------
file_exists  pass    File exists
file_type    pass    Valid AAB file
file_size    pass    148.2 MB (under 150 MB limit)
magic_bytes  pass    Valid ZIP magic bytes

Valid
```

JSON output:

```bash
gpc validate app-release.aab --output json
```

```json
{
  "valid": true,
  "checks": [
    { "name": "file_exists", "passed": true, "message": "File exists" },
    { "name": "file_type", "passed": true, "message": "Valid AAB file" },
    { "name": "file_size", "passed": true, "message": "148.2 MB (under 150 MB limit)" },
    { "name": "magic_bytes", "passed": true, "message": "Valid ZIP magic bytes" }
  ],
  "warnings": []
}
```

Validate with track and notes:

```bash
gpc validate app-release.aab \
  --track production \
  --notes "Version 2.0"
```

Exits with code 0 if valid, code 1 if any check fails.

## Related

- [status](./status) — Unified health snapshot (releases + vitals + reviews)
- [releases](./releases) — Granular release control
- [vitals](./vitals) — Quality monitoring
- [CI/CD Integration](/ci-cd/) — Automation workflows
