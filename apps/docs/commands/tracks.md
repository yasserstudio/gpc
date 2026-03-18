---
outline: deep
---

<CommandHeader
  name="gpc tracks"
  description="Manage release tracks — internal, alpha, beta, production, and custom tracks."
  usage="gpc tracks <subcommand> [options]"
  :badges="['--json']"
/>

## Commands

| Command                           | Description                          |
| --------------------------------- | ------------------------------------ |
| [`tracks list`](#tracks-list)     | List all tracks with status          |
| [`tracks get`](#tracks-get)       | Get track details including releases |
| [`tracks update`](#tracks-update) | Update track configuration           |

## `tracks list`

List all tracks for the app, showing the current status and active release for each.

### Synopsis

```bash
gpc tracks list [options]
```

### Example

```bash
gpc tracks list --app com.example.myapp
```

```json
{
  "tracks": [
    { "track": "internal", "releases": [{ "versionCodes": ["42"], "status": "completed" }] },
    { "track": "alpha", "releases": [] },
    { "track": "beta", "releases": [{ "versionCodes": ["41"], "status": "completed" }] },
    {
      "track": "production",
      "releases": [{ "versionCodes": ["40"], "status": "completed", "userFraction": 1.0 }]
    }
  ]
}
```

---

## `tracks get`

Get detailed information about a specific track, including all releases and their statuses.

### Synopsis

```bash
gpc tracks get <track> [options]
```

### Example

```bash
gpc tracks get beta --app com.example.myapp
```

```json
{
  "track": "beta",
  "releases": [
    {
      "name": "Beta 41",
      "versionCodes": ["41"],
      "status": "completed",
      "releaseNotes": [{ "language": "en-US", "text": "Bug fixes and performance improvements" }]
    }
  ]
}
```

---

## `tracks update`

Update a track's configuration from a JSON file. This sets releases, status, and rollout fraction.

### Synopsis

```bash
gpc tracks update <track> --file <path> [options]
```

### Options

| Flag        | Short | Type      | Default        | Description                      |
| ----------- | ----- | --------- | -------------- | -------------------------------- |
| `--file`    |       | `string`  | **(required)** | Path to JSON track configuration |
| `--dry-run` |       | `boolean` | `false`        | Preview changes without applying |

### Example

```bash
gpc tracks update beta --app com.example.myapp --file track-config.json
```

Preview without applying:

```bash
gpc tracks update beta --app com.example.myapp --file track-config.json --dry-run
```

## Errors

| Exit Code | Meaning                                          |
| --------- | ------------------------------------------------ |
| 2         | Invalid track name or missing required arguments |
| 3         | Authentication failure                           |
| 4         | API error (e.g., track not found, edit conflict) |

## Related

- [releases](./releases) -- Create, upload, and manage releases
- [publish](./publish) -- Upload + release in one command
