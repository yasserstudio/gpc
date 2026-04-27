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
| [`releases count`](#releases-count)                       | Count releases per track             |

## `releases upload`

Upload an AAB or APK file and assign it to a track. Creates an edit, uploads the bundle, assigns the track, and commits.

GPC uses Google's **resumable upload protocol** — files are streamed in 8 MB chunks, never buffered entirely in memory. If a network interruption occurs, the upload resumes from the last successful byte. Files under 5 MB use simple upload for efficiency.

### Synopsis

```bash
gpc releases upload <file> [options]
```

### Options

| Flag                            | Short | Type     | Default     | Description                                                                                                                                                                 |
| ------------------------------- | ----- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--track`                       |       | `string` | `internal`  | Target track (`internal`, `alpha`, `beta`, `production`, or custom)                                                                                                         |
| `--rollout`                     |       | `number` |             | Staged rollout percentage (1-100)                                                                                                                                           |
| `--notes`                       |       | `string` |             | Release notes text (en-US)                                                                                                                                                  |
| `--name`                        |       | `string` |             | Release name                                                                                                                                                                |
| `--mapping`                     |       | `string` |             | Path to ProGuard/R8 mapping file for deobfuscation                                                                                                                          |
| `--notes-dir`                   |       | `string` |             | Directory with per-language release notes (`<dir>/<lang>.txt`)                                                                                                              |
| `--notes-from-git`              |       | flag     |             | Generate Play Store release notes from git commit history (per-locale, 500-char). For GitHub Release notes, see [`gpc changelog generate`](./changelog#changelog-generate). |
| `--copy-notes-from`             |       | `string` |             | Copy release notes from another track's latest release                                                                                                                      |
| `--since`                       |       | `string` |             | Git ref to start from (tag, SHA) — used with `--notes-from-git`                                                                                                             |
| `--timeout`                     |       | `number` |             | Upload timeout in milliseconds (auto-scales with file size)                                                                                                                 |
| `--retry-log`                   |       | `string` |             | Write retry log entries to file (JSONL)                                                                                                                                     |
| `--status`                      |       | `string` | `completed` | Release status: `completed`, `inProgress`, `draft`, `halted`                                                                                                                |
| `--mapping-type`                |       | `string` | `proguard`  | Deobfuscation file type: `proguard` or `nativeCode`                                                                                                                         |
| `--device-tier-config`          |       | `string` |             | Device tier config ID (or `LATEST`) for targeted delivery                                                                                                                   |
| `--changes-not-sent-for-review` |       | flag     |             | Commit without sending for review (required for [rejected apps](#rejected-apps))                                                                                            |
| `--error-if-in-review`          |       | flag     |             | Fail if changes are already in review instead of cancelling them                                                                                                            |
| `--validate-only`               |       | flag     |             | Upload and validate without committing (edit is discarded after validation)                                                                                                 |

### Upload Progress

In interactive terminals, uploads show a real-time progress bar:

```
  ████████████░░░░░░░░  58%  120.3/207.5 MB  2.4 MB/s  ETA 36s
```

### File Size Limits

| File Type | Max Size | Notes                 |
| --------- | -------- | --------------------- |
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

Upload with native debug symbols (NDK apps):

```bash
gpc releases upload app-release.aab \
  --app com.example.myapp \
  --track beta \
  --mapping app/build/outputs/native-debug-symbols.zip \
  --mapping-type nativeCode
```

Upload with a device tier config:

```bash
gpc releases upload app-release.aab \
  --track production \
  --device-tier-config LATEST
```

Upload with multi-language notes:

```bash
gpc releases upload app-release.aab \
  --app com.example.myapp \
  --track beta \
  --notes-dir ./release-notes/
```

Upload as draft (review in Play Console before going live):

```bash
gpc releases upload app-release.aab \
  --track production \
  --status draft
```

Upload an APK (auto-detected by extension):

```bash
gpc releases upload app-release.apk --track internal
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

| Flag                            | Short | Type     | Default        | Description                                                                      |
| ------------------------------- | ----- | -------- | -------------- | -------------------------------------------------------------------------------- |
| `--from`                        |       | `string` | **(required)** | Source track                                                                     |
| `--to`                          |       | `string` | **(required)** | Target track                                                                     |
| `--rollout`                     |       | `number` |                | Staged rollout percentage (1-100) for the target track                           |
| `--notes`                       |       | `string` |                | Release notes text (en-US)                                                       |
| `--copy-notes-from`             |       | `string` |                | Copy release notes from another track's latest release                           |
| `--status`                      |       | `string` |                | Release status: `completed`, `inProgress`, `draft`, `halted`                     |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review (required for [rejected apps](#rejected-apps)) |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review instead of cancelling them                 |

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

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--track`                       |       | `string` | **(required)** | Track name                            |
| `--to`                          |       | `number` | **(required)** | New rollout percentage (1-100)        |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

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

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--track`                       |       | `string` | **(required)** | Track name                            |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

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

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--track`                       |       | `string` | **(required)** | Track name                            |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

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

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--track`                       |       | `string` | **(required)** | Track name                            |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

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

## `releases count`

Show the number of releases per track with a status breakdown.

### Synopsis

```bash
gpc releases count [options]
```

### Options

| Flag      | Type     | Description              |
| --------- | -------- | ------------------------ |
| `--track` | `string` | Filter to a single track |

### Examples

```bash
# Count across all tracks
gpc releases count

# Single track
gpc releases count --track beta

# JSON for scripting
gpc releases count --output json
```

---

## Rejected Apps

When Google Play rejects an app update, the API requires special handling. Attempting to commit an edit without the right flags will fail with an API error.

### Auto-rescue on 403

GPC automatically handles the most common rejected-app scenario. When a commit fails with a `403 changesNotSentForReview` error, GPC retries the commit once with `changesNotSentForReview` set automatically. If the retry succeeds, a warning is printed and the command exits 0. No flag required in most cases.

### `--changes-not-sent-for-review`

If your app has a **rejected** status in the Play Console and the auto-rescue does not apply (for example, when combined with `--error-if-in-review` or when you want explicit control), you can force the flag manually on any command that modifies your app:

```bash
# Upload to a rejected app (explicit flag)
gpc releases upload app.aab --track internal --changes-not-sent-for-review

# Promote on a rejected app
gpc releases promote --from internal --to beta --changes-not-sent-for-review

# Push listings on a rejected app
gpc listings push --changes-not-sent-for-review
```

With this flag, your changes are applied but **not sent for review**. You must manually send them for review from the Google Play Console web UI when ready.

### `--error-if-in-review`

By default, committing an edit while changes are already in review will **cancel the existing review** and submit the new changes. If you want to prevent that (especially useful in CI to avoid accidentally cancelling a review someone submitted manually), use:

```bash
gpc releases upload app.aab --track production --error-if-in-review
```

This will fail with exit code 4 (`API_ERROR`) and the reason `CHANGES_ALREADY_IN_REVIEW` if there's an in-progress review. The edit is not invalidated, so you can retry after the review completes.

### Both flags together

You can combine both flags when your app is rejected and you want safe CI behavior:

```bash
gpc releases upload app.aab \
  --track production \
  --changes-not-sent-for-review \
  --error-if-in-review
```

::: tip Which commands support these flags?
Every command that commits an edit supports both flags: `releases upload`, `releases promote`, `releases rollout *`, `publish`, `listings update`, `listings delete`, `listings push`, `listings images upload`, `listings images delete`, `testers add`, `testers remove`, `tracks create`, `tracks update`, and `apps update`.
:::

---

## Related

- [publish](./publish) -- High-level one-command workflow
- [listings](./listings) -- Store listing management
- [CI/CD Integration](/ci-cd/) -- Automated release pipelines
