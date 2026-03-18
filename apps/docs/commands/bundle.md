---
outline: deep
---

<CommandHeader
  name="gpc bundle"
  description="Analyze the size composition of Android App Bundles and APKs locally — no Java, no bundletool, no Android Studio required."
  usage="gpc bundle <file> [options]"
  :badges="['--json', '--size-gate']"
/>

## Commands

| Command                                       | Description                                      |
| --------------------------------------------- | ------------------------------------------------ |
| [`bundle analyze`](#bundle-analyze)           | Per-module and per-category size breakdown        |
| [`bundle compare`](#bundle-compare)           | Size diff between two bundles or APKs             |

## `bundle analyze`

Parse an AAB or APK and display size breakdown by module (base, feature modules) and category (dex, resources, assets, native libs, manifest, signing, other).

### Synopsis

```bash
gpc bundle analyze <file> [options]
```

### Options

| Flag            | Type     | Default | Description                                    |
| --------------- | -------- | ------- | ---------------------------------------------- |
| `--threshold`   | `number` |         | Fail if compressed size exceeds threshold (MB) |
| `--output`      | `string` | `table` | Output format: `table`, `json`                 |

### Example

Analyze an AAB:

```bash
gpc bundle analyze app-release.aab
```

```
File: app-release.aab
Type: AAB
Total compressed: 24.31 MB
Total uncompressed: 48.72 MB
Entries: 1,247

Modules:
  module          compressed    uncompressed    entries
  base            22.10 MB      44.50 MB        1,180
  feature_camera   1.85 MB       3.60 MB           52
  (root)         376.0 KB      620.0 KB           15

Categories:
  category        compressed    uncompressed    entries
  dex             10.20 MB      22.40 MB          12
  native-libs      8.50 MB      15.30 MB          28
  resources        3.80 MB       7.60 MB         890
  assets           1.20 MB       2.40 MB          45
  manifest        120.0 KB      280.0 KB           3
  signing          80.0 KB      180.0 KB           8
  other           410.0 KB      520.0 KB         261
```

JSON output for CI pipelines:

```bash
gpc bundle analyze app-release.aab --output json
```

CI size gate (exit code 6 if compressed size exceeds 150 MB):

```bash
gpc bundle analyze app-release.aab --threshold 150
```

---

## `bundle compare`

Compare two bundles or APKs and show size deltas by module and category. Useful for tracking size regressions between releases.

### Synopsis

```bash
gpc bundle compare <file1> <file2> [options]
```

### Options

| Flag       | Type     | Default | Description                    |
| ---------- | -------- | ------- | ------------------------------ |
| `--output` | `string` | `table` | Output format: `table`, `json` |

### Example

Compare two release builds:

```bash
gpc bundle compare v1.2.0.aab v1.3.0.aab
```

```
Before: v1.2.0.aab (24.31 MB)
After:  v1.3.0.aab (26.12 MB)
Delta:  +1.81 MB (+7.4%)

Module changes:
  module            before      after       delta
  feature_camera    1.85 MB     3.20 MB     +1.35 MB
  base              22.10 MB    22.56 MB    +460.0 KB

Category changes:
  category          before      after       delta
  native-libs       8.50 MB     9.85 MB     +1.35 MB
  dex               10.20 MB    10.60 MB    +400.0 KB
  resources         3.80 MB     3.86 MB     +60.0 KB
```

JSON output for CI diff tracking:

```bash
gpc bundle compare old.aab new.aab --output json
```

## CI Integration

### Size gate in GitHub Actions

```yaml
- name: Check bundle size
  run: gpc bundle analyze app-release.aab --threshold 150
```

Exit code 6 on threshold breach integrates with CI failure workflows.

### Size regression tracking

```yaml
- name: Compare with baseline
  run: |
    gpc bundle compare baseline.aab app-release.aab --output json > size-diff.json
```

## Errors

| Code                  | Exit | Description                                    |
| --------------------- | ---- | ---------------------------------------------- |
| `FILE_NOT_FOUND`      | 1    | The specified file does not exist               |
| `INVALID_ZIP`         | 1    | The file is not a valid ZIP archive             |
| `THRESHOLD_BREACHED`  | 6    | Compressed size exceeds `--threshold` value     |

## Related

- [releases](./releases) -- Upload and manage releases
- [internal-sharing](./internal-sharing) -- Quick QA distribution
- [Vitals Quality Gates](/ci-cd/vitals-gates) -- CI threshold alerting
