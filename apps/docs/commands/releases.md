---
outline: deep
---

<CommandHeader
  name="gpc releases"
  description="Manage releases, uploads, promotions, rollouts, and release notes."
  usage="gpc releases <subcommand> [options]"
  :badges="['--json', '--dry-run', '--track', '--rollout']"
/>

## Commands

| Command                                                   | Description                          |
| --------------------------------------------------------- | ------------------------------------ |
| [`releases upload`](#releases-upload)                     | Upload AAB/APK and assign to a track |
| [`releases status`](#releases-status)                     | Show release status across tracks    |
| [`releases promote`](#releases-promote)                   | Promote a release between tracks     |
| [`releases rollout increase`](#releases-rollout-increase) | Increase staged rollout percentage   |
| [`releases rollout halt`](#releases-rollout-halt)         | Halt a staged rollout                |
| [`releases rollout resume`](#releases-rollout-resume)     | Resume a halted rollout              |
| [`releases rollout complete`](#releases-rollout-complete) | Complete a staged rollout to 100%    |
| [`releases notes set`](#releases-notes-set)               | Set release notes for a track        |
| [`releases diff`](#releases-diff)                         | Compare releases between two tracks  |

## `releases upload`

Upload an AAB or APK file and assign it to a track. Creates an edit, uploads the bundle, assigns the track, and commits.

GPC uses Google's **resumable upload protocol** — files are streamed in 8 MB chunks, never buffered entirely in memory. If a network interruption occurs, the upload resumes from the last successful byte. Files under 5 MB use simple upload for efficiency.

### Synopsis

```bash
gpc releases upload <file> [options]
```

### Options

| Flag               | Short | Type     | Default    | Description                                                         |
| ------------------ | ----- | -------- | ---------- | ------------------------------------------------------------------- |
| `--track`          |       | `string` | `internal` | Target track (`internal`, `alpha`, `beta`, `production`, or custom) |
| `--rollout`        |       | `number` |            | Staged rollout percentage (1-100)                                   |
| `--notes`          |       | `string` |            | Release notes text (en-US)                                          |
| `--name`           |       | `string` |            | Release name                                                        |
| `--mapping`        |       | `string` |            | Path to ProGuard/R8 mapping file for deobfuscation                  |
| `--notes-dir`      |       | `string` |            | Directory with per-language release notes (`<dir>/<lang>.txt`)      |
| `--notes-from-git` |       | flag     |            | Generate release notes from git commit history                      |
| `--since`          |       | `string` |            | Git ref to start from (tag, SHA) — used with `--notes-from-git`     |
| `--timeout`        |       | `number` |            | Upload timeout in milliseconds (auto-scales with file size)         |
| `--retry-log`      |       | `string` |            | Write retry log entries to file (JSONL)                             |

### Upload Progress

In interactive terminals, uploads show a real-time progress bar:

```
  ████████████░░░░░░░░  58%  120.3/207.5 MB  2.4 MB/s  ETA 36s
```

### File Size Limits

| File Type | Max Size | Notes |
| --------- | -------- | ----- |
| AAB       | 2 GB     | Google Play API limit |
| APK       | 1 GB     | Google Play API limit |

::: tip Validation
The file is validated before any API calls: existence, extension (.aab/.apk), ZIP magic bytes, and size limits. Invalid files exit code 2 immediately.
`--rollout` must be between 1–100. Values outside that range exit code 2.
:::

### Example

Upload to internal track:

```bash
gpc releases upload app-release.aab --app com.example.myapp
```

Upload to production with 10% staged rollout:

```bash
gpc releases upload app-release.aab \
  --app com.example.myapp \
  --track production \
  --rollout 10 \
  --notes "Bug fixes and performance improvements"
```

Upload with deobfuscation mapping:

```bash
gpc releases upload app-release.aab \
  --app com.example.myapp \
  --track beta \
  --mapping app/build/outputs/mapping/release/mapping.txt
```

Upload with multi-language notes:

```bash
gpc releases upload app-release.aab \
  --app com.example.myapp \
  --track beta \
  --notes-dir ./release-notes/
```

---

## `releases status`

Show current release status across all tracks or a specific track.

### Synopsis

```bash
gpc releases status [options]
```

### Options

| Flag      | Short | Type     | Default | Description                |
| --------- | ----- | -------- | ------- | -------------------------- |
| `--track` |       | `string` |         | Filter by a specific track |

### Example

Show all tracks:

```bash
gpc releases status --app com.example.myapp
```

Show a single track:

```bash
gpc releases status --app com.example.myapp --track production
```

The `userFraction` column shows rollout percentage (e.g., `10%`) or `—` for a full rollout. Output is sorted production → beta → alpha → internal by default unless `--sort` is specified.

```json
{
  "tracks": [
    {
      "track": "production",
      "releases": [
        {
          "name": "42",
          "status": "inProgress",
          "userFraction": 0.1,
          "versionCodes": ["42"]
        }
      ]
    }
  ]
}
```

---

## `releases promote`

Promote a release from one track to another. Copies the latest release from the source track to the target track.

### Synopsis

```bash
gpc releases promote --from <track> --to <track> [options]
```

### Options

| Flag        | Short | Type     | Default        | Description                                            |
| ----------- | ----- | -------- | -------------- | ------------------------------------------------------ |
| `--from`    |       | `string` | **(required)** | Source track                                           |
| `--to`      |       | `string` | **(required)** | Target track                                           |
| `--rollout` |       | `number` |                | Staged rollout percentage (1-100) for the target track |
| `--notes`   |       | `string` |                | Release notes text (en-US)                             |

::: tip Validation
`--from` and `--to` must be different tracks. Passing the same value for both exits code 2.
`--rollout` must be between 1–100. Values outside that range exit code 2.
:::

### Example

Promote from internal to beta:

```bash
gpc releases promote \
  --app com.example.myapp \
  --from internal \
  --to beta
```

Promote from beta to production with staged rollout:

```bash
gpc releases promote \
  --app com.example.myapp \
  --from beta \
  --to production \
  --rollout 5 \
  --notes "Promoting stable beta build"
```

Preview the promotion without executing:

```bash
gpc releases promote --from internal --to beta --dry-run
```

---

## `releases rollout increase`

Increase the staged rollout percentage for a release on a track.

### Synopsis

```bash
gpc releases rollout increase --track <track> --to <percent>
```

### Options

| Flag      | Short | Type     | Default        | Description                    |
| --------- | ----- | -------- | -------------- | ------------------------------ |
| `--track` |       | `string` | **(required)** | Track name                     |
| `--to`    |       | `number` | **(required)** | New rollout percentage (1-100) |

::: tip Validation
`--to` must be between 1–100. Values outside that range exit code 2.
:::

### Example

```bash
gpc releases rollout increase \
  --app com.example.myapp \
  --track production \
  --to 50
```

---

## `releases rollout halt`

Halt a staged rollout. No new users will receive the release.

### Synopsis

```bash
gpc releases rollout halt --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description |
| --------- | ----- | -------- | -------------- | ----------- |
| `--track` |       | `string` | **(required)** | Track name  |

### Example

```bash
gpc releases rollout halt \
  --app com.example.myapp \
  --track production
```

---

## `releases rollout resume`

Resume a previously halted staged rollout.

### Synopsis

```bash
gpc releases rollout resume --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description |
| --------- | ----- | -------- | -------------- | ----------- |
| `--track` |       | `string` | **(required)** | Track name  |

### Example

```bash
gpc releases rollout resume \
  --app com.example.myapp \
  --track production
```

---

## `releases rollout complete`

Complete a staged rollout, pushing the release to 100% of users.

### Synopsis

```bash
gpc releases rollout complete --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description |
| --------- | ----- | -------- | -------------- | ----------- |
| `--track` |       | `string` | **(required)** | Track name  |

### Example

```bash
gpc releases rollout complete \
  --app com.example.myapp \
  --track production
```

---

## `releases notes set`

::: warning Not yet implemented
`gpc releases notes set` is not yet available as a standalone command. Running it exits code 1 with a redirect message.

To set release notes today, use the `--notes`, `--notes-dir`, or `--notes-from-git` flags on the commands that do support them:

```bash
# Set notes during upload
gpc releases upload app.aab --track beta --notes "Bug fixes"

# Set notes during publish
gpc publish app.aab --notes "Bug fixes"

# Set per-language notes from a directory
gpc releases upload app.aab --track beta --notes-dir ./release-notes/
```

Full standalone support is planned for a future release.
:::

## `releases diff`

Compare releases between two tracks (e.g., internal vs production). Shows differences in version codes, status, rollout percentage, release notes, and release name.

### Synopsis

```bash
gpc releases diff [options]
```

### Options

| Flag     | Short | Type     | Default      | Description  |
| -------- | ----- | -------- | ------------ | ------------ |
| `--from` |       | `string` | `internal`   | Source track |
| `--to`   |       | `string` | `production` | Target track |

### Example

Compare internal and production tracks:

```bash
gpc releases diff --app com.example.myapp
```

Compare specific tracks:

```bash
gpc releases diff \
  --app com.example.myapp \
  --from beta \
  --to production
```

```
Comparing releases: beta → production

  versionCodes: 142 → 140
  status: completed → inProgress
  userFraction: (none) → 0.5
```

Use `--output json` for structured diff output. Returns "No differences found" when tracks have identical latest releases.

---

## Related

- [publish](./publish) -- High-level one-command workflow
- [listings](./listings) -- Store listing management
- [CI/CD Integration](/ci-cd/) -- Automated release pipelines
