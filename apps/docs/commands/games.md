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

## Roadmap

The current commands wrap the runtime `games v1` API (player-facing leaderboards, achievements, events). For CI/CD and publisher workflows, the more useful surface is `gamesconfiguration v1configuration`: CRUD on achievement and leaderboard **definitions** from a terminal or pipeline.

Planned shape:

| Current                                       | Planned (publisher config)                               |
| --------------------------------------------- | -------------------------------------------------------- |
| `gpc games leaderboards` (list-only, runtime) | `gpc games leaderboards {list,get,create,update,delete}` |
| `gpc games achievements` (list-only, runtime) | `gpc games achievements {list,get,create,update,delete}` |
| `gpc games events` (runtime)                  | _(removed, no publisher equivalent)_                     |

See [Planned coverage](../reference/api-coverage.md#games-apis-strategic-direction) for context.

## See Also

- [Google Play Games Services documentation](https://developers.google.com/games/services)
