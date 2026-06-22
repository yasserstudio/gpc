# Games Publishing

Manage Play Games Services achievement and leaderboard configurations from the terminal or CI/CD pipeline.

## Prerequisites

1. **Play Games Services enabled** in the Google Play Console for your app
2. A **service account** with the `androidpublisher` scope (the same one GPC uses for publishing)
3. Your **Games application ID** (numeric) -- found in Play Console under **Play Games Services > Setup & management > Configuration**

## Configuration

Set your application ID once in `.gpcrc.json`:

```json
{
  "app": "com.example.mygame",
  "games": {
    "applicationId": "12345678901234"
  }
}
```

Or pass it per command with `--game-id`, or set the `GPC_GAME_ID` environment variable. The resolution order is: flag, env, config.

## Creating Achievements

Define an achievement in a JSON file:

```json
{
  "achievementType": "STANDARD",
  "initialState": "HIDDEN",
  "draft": {
    "name": {
      "translations": [
        { "locale": "en-US", "value": "First Victory" },
        { "locale": "fr-FR", "value": "Premiere victoire" }
      ]
    },
    "description": {
      "translations": [
        { "locale": "en-US", "value": "Win your first match" },
        { "locale": "fr-FR", "value": "Gagnez votre premier match" }
      ]
    },
    "pointValue": 10
  }
}
```

```sh
gpc games achievements create --file achievements/first-victory.json
```

For incremental achievements (progress-based):

```json
{
  "achievementType": "INCREMENTAL",
  "initialState": "REVEALED",
  "stepsToUnlock": 100,
  "draft": {
    "name": {
      "translations": [{ "locale": "en-US", "value": "Centurion" }]
    },
    "description": {
      "translations": [{ "locale": "en-US", "value": "Play 100 matches" }]
    },
    "pointValue": 50
  }
}
```

## Creating Leaderboards

```json
{
  "scoreOrder": "LARGER_IS_BETTER",
  "draft": {
    "name": {
      "translations": [{ "locale": "en-US", "value": "All-Time High Scores" }]
    },
    "scoreFormat": {
      "numberFormatType": "NUMERIC"
    }
  }
}
```

```sh
gpc games leaderboards create --file leaderboards/high-scores.json
```

Score format types:
- `NUMERIC` -- plain number (points, count)
- `TIME_DURATION` -- milliseconds displayed as time
- `CURRENCY` -- monetary value (requires `currencyCode`)

## Syncing with Diff

Before updating, compare your local definition against the remote:

```sh
gpc games achievements diff CgkI1234567890 --file achievements/first-victory.json
```

If there are differences, apply them:

```sh
gpc games achievements update CgkI1234567890 --file achievements/first-victory.json
```

## CI/CD Workflow

Store game configuration JSON files in your repo and sync them on merge:

```yaml
# .github/workflows/games-sync.yml
name: Sync Games Config
on:
  push:
    branches: [main]
    paths: ['games/**']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: yasserstudio/gpc-action@v1
        with:
          service-account-json: ${{ secrets.GPC_SERVICE_ACCOUNT }}
      - run: |
          for f in games/achievements/*.json; do
            id=$(jq -r '.id // empty' "$f")
            if [ -n "$id" ]; then
              gpc games achievements update "$id" --file "$f"
            else
              gpc games achievements create --file "$f"
            fi
          done
        env:
          GPC_GAME_ID: ${{ vars.GAME_ID }}
```

## Draft vs Published

The Configuration API uses a draft/published model:
- **draft**: editable, visible only to testers
- **published**: live, read-only via this API

When you create or update a configuration, changes go to the `draft` state. Publishing happens through the Play Console UI when you publish your Play Games Services configuration.

## Deprecation Note

Google deprecated the Play Games v1 SDK (September 2025) with full shutdown in June 2027. The Configuration API uses a separate path (`v1configuration`) and the `androidpublisher` scope, and has no announced deprecation. GPC will track any changes.

## See Also

- [Command Reference](/commands/games) -- full CLI syntax
- [API Coverage](/reference/api-coverage#games-apis)
