---
outline: deep
---

# releases

Manage releases, uploads, promotions, rollouts, and release notes.

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

### Synopsis

```bash
gpc releases upload <file> [options]
```

### Options

| Flag          | Short | Type     | Default    | Description                                                         |
| ------------- | ----- | -------- | ---------- | ------------------------------------------------------------------- |
| `--track`     |       | `string` | `internal` | Target track (`internal`, `alpha`, `beta`, `production`, or custom) |
| `--rollout`   |       | `number` |            | Staged rollout percentage (1-100)                                   |
| `--notes`     |       | `string` |            | Release notes text (en-US)                                          |
| `--name`      |       | `string` |            | Release name                                                        |
| `--mapping`   |       | `string` |            | Path to ProGuard/R8 mapping file for deobfuscation                  |
| `--notes-dir` |       | `string` |            | Directory with per-language release notes (`<dir>/<lang>.txt`)      |
| `--retry-log` |       | `string` |            | Write retry log entries to file (JSONL)                             |

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

Set release notes for an existing release on a track.

### Synopsis

```bash
gpc releases notes set --track <track> [options]
```

### Options

| Flag      | Short | Type     | Default        | Description            |
| --------- | ----- | -------- | -------------- | ---------------------- |
| `--track` |       | `string` | **(required)** | Track name             |
| `--lang`  |       | `string` | `en-US`        | Language code (BCP 47) |
| `--notes` |       | `string` |                | Release notes text     |
| `--file`  |       | `string` |                | Read notes from a file |

### Example

Set notes inline:

```bash
gpc releases notes set \
  --app com.example.myapp \
  --track beta \
  --lang en-US \
  --notes "Bug fixes and performance improvements"
```

Set notes from a file:

```bash
gpc releases notes set \
  --app com.example.myapp \
  --track beta \
  --lang ja-JP \
  --file release-notes/ja-JP.txt
```

## `releases diff`

Compare releases between two tracks (e.g., internal vs production). Shows differences in version codes, status, rollout percentage, release notes, and release name.

### Synopsis

```bash
gpc releases diff [options]
```

### Options

| Flag     | Short | Type     | Default      | Description  |
| -------- | ----- | -------- | ------------ | ------------ |
| `--from` |       | `string` | `internal`   | Source track  |
| `--to`   |       | `string` | `production` | Target track  |

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
