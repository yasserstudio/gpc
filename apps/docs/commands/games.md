# gpc games

Manage Play Games Services configurations -- achievements and leaderboards. Uses the Games Configuration API (`gamesconfiguration v1configuration`) for publisher CRUD operations.

::: tip No Extra Auth
The Configuration API uses the `androidpublisher` OAuth scope that GPC already requests. No additional scope or API enablement is needed.
:::

## Synopsis

```sh
gpc games [--game-id <id>] <subcommand>
```

## Global Option

### `--game-id <id>`

Games application ID (numeric). Found in Play Console under **Play Games Services > Setup**.

Resolution order:

1. `--game-id` flag
2. `GPC_GAME_ID` environment variable
3. `games.applicationId` in `.gpcrc.json`

```json
// .gpcrc.json
{
  "app": "com.example.mygame",
  "games": {
    "applicationId": "12345678901234"
  }
}
```

## Achievements

### `games achievements list`

List all achievement configurations.

```sh
gpc games achievements list
gpc games achievements list --limit 10 --next-page <token>
gpc games achievements list --json
```

| Flag                  | Description              |
| --------------------- | ------------------------ |
| `--limit <n>`         | Maximum results per page |
| `--next-page <token>` | Resume from page token   |

### `games achievements get <achievement-id>`

Get a single achievement configuration.

```sh
gpc games achievements get CgkI1234567890
```

### `games achievements create --file <path>`

Create an achievement from a JSON file.

```sh
gpc games achievements create --file achievement.json
gpc games achievements create --file achievement.json --dry-run
```

Example `achievement.json`:

```json
{
  "achievementType": "STANDARD",
  "initialState": "HIDDEN",
  "draft": {
    "name": {
      "translations": [{ "locale": "en-US", "value": "First Victory" }]
    },
    "description": {
      "translations": [{ "locale": "en-US", "value": "Win your first match" }]
    },
    "pointValue": 10
  }
}
```

For incremental achievements, set `"achievementType": "INCREMENTAL"` and add `"stepsToUnlock": 100`.

### `games achievements update <achievement-id> --file <path>`

Update an existing achievement.

```sh
gpc games achievements update CgkI1234567890 --file achievement.json
```

### `games achievements delete <achievement-id>`

Delete an achievement. Prompts for confirmation.

```sh
gpc games achievements delete CgkI1234567890
gpc games achievements delete CgkI1234567890 --yes  # skip confirmation
```

### `games achievements diff <achievement-id> --file <path>`

Compare a local JSON file against the remote achievement configuration.

```sh
gpc games achievements diff CgkI1234567890 --file achievement.json
```

Shows field-by-field differences between local and remote state.

### `games achievements set-icon <achievement-id> <file>`

Upload an achievement icon (PNG or JPG, 512x512). The content type is inferred from the file extension.

```sh
gpc games achievements set-icon CgkI1234567890 ./icons/first-win.png
```

Honors `--dry-run` (prints the intended upload without sending it).

### `games achievements push <dir>`

Create or update achievement configurations from a directory of JSON files. Each file with an `id` is updated; each file without one is created. Follows the same shape as `create`/`update`.

```sh
gpc games achievements push ./game-config/achievements
gpc games achievements push ./game-config/achievements --dry-run
```

`--dry-run` reports what would be created or updated without making any API writes.

### `games achievements pull <dir>`

Write every achievement configuration to a directory as `<id>.json` files (creating the directory if needed). Follows pagination, so all configurations are written.

```sh
gpc games achievements pull ./game-config/achievements
```

## Leaderboards

### `games leaderboards list`

List all leaderboard configurations.

```sh
gpc games leaderboards list
gpc games leaderboards list --limit 10 --json
```

| Flag                  | Description              |
| --------------------- | ------------------------ |
| `--limit <n>`         | Maximum results per page |
| `--next-page <token>` | Resume from page token   |

### `games leaderboards get <leaderboard-id>`

Get a single leaderboard configuration.

```sh
gpc games leaderboards get CgkI9876543210
```

### `games leaderboards create --file <path>`

Create a leaderboard from a JSON file.

```sh
gpc games leaderboards create --file leaderboard.json
```

Example `leaderboard.json`:

```json
{
  "scoreOrder": "LARGER_IS_BETTER",
  "draft": {
    "name": {
      "translations": [{ "locale": "en-US", "value": "High Scores" }]
    },
    "scoreFormat": {
      "numberFormatType": "NUMERIC"
    }
  }
}
```

Score format types: `NUMERIC`, `TIME_DURATION`, `CURRENCY`.

### `games leaderboards update <leaderboard-id> --file <path>`

Update an existing leaderboard.

```sh
gpc games leaderboards update CgkI9876543210 --file leaderboard.json
```

### `games leaderboards delete <leaderboard-id>`

Delete a leaderboard. Prompts for confirmation.

```sh
gpc games leaderboards delete CgkI9876543210
```

### `games leaderboards diff <leaderboard-id> --file <path>`

Compare a local JSON file against the remote leaderboard configuration.

```sh
gpc games leaderboards diff CgkI9876543210 --file leaderboard.json
```

### `games leaderboards set-icon <leaderboard-id> <file>`

Upload a leaderboard icon (PNG or JPG, 512x512). Content type is inferred from the file extension. Honors `--dry-run`.

```sh
gpc games leaderboards set-icon CgkI9876543210 ./icons/high-scores.png
```

### `games leaderboards push <dir>` / `games leaderboards pull <dir>`

Bulk sync leaderboard configurations to and from a directory of JSON files, the same as the achievement `push`/`pull` commands above. `push` creates configs without an `id` and updates those with one (`--dry-run` supported); `pull` writes every config (following pagination) to `<id>.json`.

```sh
gpc games leaderboards push ./game-config/leaderboards
gpc games leaderboards pull ./game-config/leaderboards
```

## Runtime (Read-Only)

Inspect player-facing runtime data from the Games v1 API. These commands are read-only.

### `games runtime leaderboards`

List runtime leaderboard data.

```sh
gpc games runtime leaderboards --app com.example.mygame
```

### `games runtime achievements`

List runtime achievement data.

```sh
gpc games runtime achievements --app com.example.mygame
```

## Output

All subcommands support the standard `--output` formats: `table`, `json`, `yaml`, `markdown`, `csv`, `tsv`.

## Breaking Changes (v0.9.86)

- `gpc games events` removed. Events are configured through the Play Console UI. The previous command was read-only against the player-facing runtime API.
- Existing runtime list commands moved under `gpc games runtime`.

## See Also

- [Games Publishing Guide](/guide/games-publishing) -- step-by-step setup and CI/CD patterns
- [API Coverage](/reference/api-coverage#games-apis) -- endpoint status
- [Google Play Games Services documentation](https://developers.google.com/games/services)
