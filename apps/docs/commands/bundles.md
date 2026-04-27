---
outline: deep
---

<CommandHeader
  name="gpc bundles"
  description="Query uploaded app bundles via the Google Play API."
  usage="gpc bundles <subcommand> [options]"
  :badges="['--json']"
/>

::: tip Local AAB/APK analysis
`gpc bundles` queries bundles on Google Play (API). For local AAB/APK analysis, see [`gpc bundle`](bundle.md).
:::

## Commands

| Command                           | Description                                           |
| --------------------------------- | ----------------------------------------------------- |
| [`bundles list`](#bundles-list)   | List all processed bundles for the configured app     |
| [`bundles find`](#bundles-find)   | Find a specific bundle by version code                |
| [`bundles wait`](#bundles-wait)   | Wait for a bundle to finish server-side processing    |

## `bundles list`

List all processed bundles for the configured app.

### Synopsis

```bash
gpc bundles list [options]
```

### Options

| Flag               | Short | Type     | Default  | Description                 |
| ------------------ | ----- | -------- | -------- | --------------------------- |
| `--output <format>` |       | `string` | `table`  | Output format: `table`, `json`, `csv`, `tsv` |
| `--json`           |       | flag     |          | Alias for `--output json`   |

### Example

```bash
gpc bundles list --app com.example.myapp
```

```
versionCode  sha256
───────────  ───────────────
         19  19b59ab90be7...
         22  2f36cd95f030...
         30  76e0499aad0a...
```

---

## `bundles find`

Find a specific bundle by version code.

### Synopsis

```bash
gpc bundles find [options]
```

### Options

| Flag                    | Short | Type     | Default        | Description                          |
| ----------------------- | ----- | -------- | -------------- | ------------------------------------ |
| `--version-code <n>`    |       | `number` | **(required)** | Version code to find                 |
| `--output <format>`     |       | `string` | `table`        | Output format: `table`, `json`, `csv`, `tsv` |
| `--json`                |       | flag     |                | Alias for `--output json`            |

Exits with code `1` if no bundle with the given version code is found.

### Example

```bash
gpc bundles find --version-code 30 --app com.example.myapp
```

---

## `bundles wait`

Wait for a bundle to finish server-side processing. Useful in CI pipelines immediately after upload, when the bundle may still be processing.

### Synopsis

```bash
gpc bundles wait [options]
```

### Options

| Flag                  | Short | Type     | Default        | Description                                       |
| --------------------- | ----- | -------- | -------------- | ------------------------------------------------- |
| `--version-code <n>`  |       | `number` | **(required)** | Version code to wait for                          |
| `--timeout <seconds>` |       | `number` | `600`          | Maximum time to wait before failing               |
| `--interval <seconds>`|       | `number` | `15`           | Poll interval in seconds                          |
| `--output <format>`   |       | `string` | `table`        | Output format: `table`, `json`, `csv`, `tsv`      |
| `--json`              |       | flag     |                | Alias for `--output json`                         |

Throws `BUNDLE_WAIT_TIMEOUT` if the bundle does not appear within the configured timeout. Retries automatically on transient errors (429, 500, 503).

### CI example

```bash
gpc releases upload app.aab --track production
gpc bundles wait --version-code 42 --timeout 300 --json
```
