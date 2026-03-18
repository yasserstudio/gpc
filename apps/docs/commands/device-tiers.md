---
outline: deep
---

<CommandHeader
  name="gpc device-tiers"
  description="Manage device tier configurations for capability-based targeting."
  usage="gpc device-tiers <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

## Commands

| Command                                       | Description                                  |
| --------------------------------------------- | -------------------------------------------- |
| [`device-tiers list`](#device-tiers-list)     | List all device tier configurations          |
| [`device-tiers get`](#device-tiers-get)       | Get details of a specific tier configuration |
| [`device-tiers create`](#device-tiers-create) | Create a new device tier configuration       |

## `device-tiers list`

List all device tier configurations for the app.

### Synopsis

```bash
gpc device-tiers list [options]
```

### Options

| Flag      | Short | Type     | Default | Description               |
| --------- | ----- | -------- | ------- | ------------------------- |
| `--app`   |       | `string` |         | App package name          |
| `--limit` |       | `number` | `25`    | Maximum number of results |
| `--json`  |       | `flag`   |         | Output as JSON            |

### Example

List all tier configs:

```bash
gpc device-tiers list --app com.example.myapp
```

```
Device Tier Configurations

  Config ID    Groups   Created
  ─────────    ──────   ───────
  dt-config-1  3        2025-11-02
  dt-config-2  2        2026-01-15

  2 configurations found
```

List with JSON output:

```bash
gpc device-tiers list --app com.example.myapp --json
```

```json
{
  "deviceTierConfigs": [
    {
      "deviceTierConfigId": "dt-config-1",
      "deviceGroups": [
        {
          "name": "high_end",
          "deviceSelectors": [{ "deviceRam": { "minBytes": "6442450944" } }]
        },
        {
          "name": "mid_range",
          "deviceSelectors": [
            { "deviceRam": { "minBytes": "3221225472", "maxBytes": "6442450943" } }
          ]
        },
        {
          "name": "low_end",
          "deviceSelectors": [{ "deviceRam": { "maxBytes": "3221225471" } }]
        }
      ]
    }
  ]
}
```

---

## `device-tiers get`

Get the full details of a specific device tier configuration, including all device groups and their selectors.

### Synopsis

```bash
gpc device-tiers get <config-id> [options]
```

### Options

| Flag     | Short | Type     | Default | Description      |
| -------- | ----- | -------- | ------- | ---------------- |
| `--app`  |       | `string` |         | App package name |
| `--json` |       | `flag`   |         | Output as JSON   |

### Example

```bash
gpc device-tiers get dt-config-1 --app com.example.myapp
```

```
Device Tier Configuration: dt-config-1

  Group: high_end
    RAM >= 6 GB

  Group: mid_range
    RAM >= 3 GB, < 6 GB

  Group: low_end
    RAM < 3 GB
```

---

## `device-tiers create`

Create a new device tier configuration from a JSON file. The file defines device groups with selectors based on RAM, SoC, or other device properties.

### Synopsis

```bash
gpc device-tiers create --file <path> [options]
```

### Options

| Flag     | Short | Type     | Default        | Description              |
| -------- | ----- | -------- | -------------- | ------------------------ |
| `--file` | `-f`  | `string` | **(required)** | Path to JSON config file |
| `--app`  |       | `string` |                | App package name         |
| `--json` |       | `flag`   |                | Output as JSON           |

### Example

Create a configuration file (`tiers.json`):

```json
{
  "deviceGroups": [
    {
      "name": "premium",
      "deviceSelectors": [
        {
          "deviceRam": { "minBytes": "8589934592" },
          "includedSystemOnChips": [{ "make": "Qualcomm", "model": "SM8550" }]
        }
      ]
    },
    {
      "name": "standard",
      "deviceSelectors": [
        {
          "deviceRam": { "minBytes": "4294967296", "maxBytes": "8589934591" }
        }
      ]
    },
    {
      "name": "lite",
      "deviceSelectors": [
        {
          "deviceRam": { "maxBytes": "4294967295" }
        }
      ]
    }
  ]
}
```

Then create the tier configuration:

```bash
gpc device-tiers create --file tiers.json --app com.example.myapp
```

```
Created device tier configuration: dt-config-3
  3 device groups defined (premium, standard, lite)
```

## Errors

| Code                           | Exit | Description                                                       |
| ------------------------------ | ---- | ----------------------------------------------------------------- |
| `DEVICE_TIER_CONFIG_NOT_FOUND` | 4    | The specified config ID does not exist for this app               |
| `INVALID_DEVICE_TIER_CONFIG`   | 2    | The JSON file is missing required fields or has invalid selectors |
| `API_ERROR`                    | 4    | Google Play API rejected the request                              |

## Related

- [generated-apks](./generated-apks) -- Download APKs generated for specific device tiers
- [releases](./releases) -- Manage releases and track assignments
