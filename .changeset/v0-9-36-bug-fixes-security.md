---
"@gpc-cli/core": patch
"@gpc-cli/cli": patch
---

fix: v0.9.36 — bug fixes and security hardening

- fix(core): `gpc vitals lmk` — correct metric names to `stuckBackgroundWakelockRate7dUserWeighted` and `stuckBackgroundWakelockRate28dUserWeighted`; base metric is invalid for this metric set (Bug H)
- fix(cli): `gpc quickstart` — remove `--quiet` from doctor subprocess args; Commander treated it as unknown subcommand option causing exit 1 even when all checks passed (Bug M)
- fix(cli): `gpc quota usage` — use same human-friendly table format as `quota status`; `topCommands` no longer shows `[object Object]` (Bug O)
- fix(core): `sendNotification` — replace `execSync` shell string with `execFile` array args on all platforms; eliminates shell injection via notification title/body on Windows, Linux, and macOS (Bug N)
