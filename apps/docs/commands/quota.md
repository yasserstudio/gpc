# gpc quota

View Google Play API quota usage tracked from the local audit log. GPC logs all API calls to the audit log, and this command aggregates them against the known Google Play Developer API limits.

::: info Limits
The Google Play Developer API has a **200,000 calls/day** and **3,000 calls/minute** quota. These values are estimates based on documented limits — actual limits may vary by account.
:::

## Subcommands

### `quota status`

Show a summary of daily and per-minute API call usage.

```sh
gpc quota status

# API Quota Usage
# ─────────────────────────────────────────────
# Daily:   142 / 200,000 (0.1%)
#          Remaining: 199,858
# Minute:  3 / 3,000 (0.1%)
#          Remaining: 2,997
#
# Top commands today:
#   releases list                    45
#   vitals overview                  32
#   reviews list                     28
```

### `quota usage`

Alias for `quota status`. Outputs raw JSON if `--output json` is set.

```sh
gpc quota usage --output json
```

## How It Works

GPC writes an entry to the audit log (`~/.config/gpc/audit.log`) for every API call. The `quota` command reads this log and aggregates:

- **Daily calls**: all entries since midnight UTC
- **Minute calls**: entries in the last 60 seconds

## Notes

- Quota tracking is based on local audit log data only. It does not query the Google API for actual quota state.
- If the audit log is disabled or cleared, counts will not reflect actual usage.
- Enable audit logging with `gpc config set audit.enabled true` (default: on).

## See Also

- [`gpc audit`](/commands/utility) — view and clear the audit log
