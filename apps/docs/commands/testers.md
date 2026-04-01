---
outline: deep
---

<CommandHeader
  name="gpc testers"
  description="Manage testers and tester groups for testing tracks. Supports bulk CSV import and export."
  usage="gpc testers <subcommand> [options]"
  :badges="['--json', '--track', '--dry-run']"
/>

## Commands

| Command                             | Description                    |
| ----------------------------------- | ------------------------------ |
| [`testers list`](#testers-list)     | List testers for a track       |
| [`testers add`](#testers-add)       | Add testers to a track         |
| [`testers remove`](#testers-remove) | Remove testers from a track    |
| [`testers import`](#testers-import) | Import testers from a CSV file |

## `testers list`

List all testers (Google Group emails) assigned to a testing track.

### Synopsis

```bash
gpc testers list --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description                                         |
| --------- | ----- | -------- | -------------- | --------------------------------------------------- |
| `--track` |       | `string` | **(required)** | Track name (`internal`, `alpha`, `beta`, or custom) |

### Example

```bash
gpc testers list --app com.example.myapp --track internal
```

```json
{
  "testers": ["tester1@example.com", "tester2@example.com", "qa-team@googlegroups.com"]
}
```

List beta testers:

```bash
gpc testers list --app com.example.myapp --track beta
```

---

## `testers add`

Add one or more testers (email addresses or Google Group emails) to a track. Merges with existing testers and deduplicates.

### Synopsis

```bash
gpc testers add <emails...> --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description                                         |
| --------- | ----- | -------- | -------------- | --------------------------------------------------- |
| `--track` |       | `string` | **(required)** | Track name (`internal`, `alpha`, `beta`, or custom) |
| `--changes-not-sent-for-review` | | flag | | Commit without sending for review |
| `--error-if-in-review` | | flag | | Fail if changes are already in review |

### Example

Add individual testers:

```bash
gpc testers add user1@example.com user2@example.com \
  --app com.example.myapp \
  --track internal
```

Add a Google Group:

```bash
gpc testers add qa-team@googlegroups.com \
  --app com.example.myapp \
  --track beta
```

Preview without adding:

```bash
gpc testers add user1@example.com \
  --app com.example.myapp \
  --track internal \
  --dry-run
```

---

## `testers remove`

Remove one or more testers from a track.

### Synopsis

```bash
gpc testers remove <emails...> --track <track>
```

### Options

| Flag      | Short | Type     | Default        | Description                                         |
| --------- | ----- | -------- | -------------- | --------------------------------------------------- |
| `--track` |       | `string` | **(required)** | Track name (`internal`, `alpha`, `beta`, or custom) |
| `--changes-not-sent-for-review` | | flag | | Commit without sending for review |
| `--error-if-in-review` | | flag | | Fail if changes are already in review |

### Example

```bash
gpc testers remove user1@example.com \
  --app com.example.myapp \
  --track internal
```

Remove multiple testers:

```bash
gpc testers remove user1@example.com user2@example.com \
  --app com.example.myapp \
  --track beta
```

---

## `testers import`

Bulk import testers from a CSV file. The file should contain email addresses separated by commas or newlines.

### Synopsis

```bash
gpc testers import --track <track> --file <path>
```

### Options

| Flag      | Short | Type     | Default        | Description                                         |
| --------- | ----- | -------- | -------------- | --------------------------------------------------- |
| `--track` |       | `string` | **(required)** | Track name (`internal`, `alpha`, `beta`, or custom) |
| `--file`  |       | `string` | **(required)** | Path to CSV file with email addresses               |

### Example

Create a CSV file (`testers.csv`):

```csv
tester1@example.com
tester2@example.com
tester3@example.com
qa-group@googlegroups.com
```

Import testers:

```bash
gpc testers import \
  --app com.example.myapp \
  --track internal \
  --file testers.csv
```

```json
{
  "added": 4,
  "testers": [
    "tester1@example.com",
    "tester2@example.com",
    "tester3@example.com",
    "qa-group@googlegroups.com"
  ]
}
```

Preview without importing:

```bash
gpc testers import \
  --app com.example.myapp \
  --track internal \
  --file testers.csv \
  --dry-run
```

## Related

- [users](./users) -- Developer account user management
- [releases](./releases) -- Release tracks and rollouts
