# gpc games

Manage Play Games Services — leaderboards, achievements, and events. Uses the Google Play Games API v1.

::: warning OAuth Required
Play Games Services requires the `games` OAuth scope. Ensure your service account or OAuth credentials have this scope enabled.
:::

## Synopsis

```sh
gpc games [--app <package>] <subcommand>
```

## Subcommands

### `games leaderboards`

List all leaderboards for the app.

```sh
gpc games leaderboards
gpc games leaderboards --output json
```

### `games achievements`

List all achievements for the app.

```sh
gpc games achievements
```

### `games events`

List all events for the app.

```sh
gpc games events
```

## Output

All subcommands support the standard `--output` formats: `table`, `json`, `yaml`, `markdown`.

## See Also

- [Google Play Games Services documentation](https://developers.google.com/games/services)
