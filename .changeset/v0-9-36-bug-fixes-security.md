---
"@gpc-cli/core": patch
"@gpc-cli/cli": patch
---

fix: v0.9.36 — bug fixes, security hardening, and regression tests

- fix(core): `gpc vitals lmk` — correct metric names to `stuckBackgroundWakelockRate7dUserWeighted` and `stuckBackgroundWakelockRate28dUserWeighted`; base metric rejected by API with 400 INVALID_ARGUMENT (Bug H)
- fix(cli): `gpc quickstart` — remove `--quiet` from doctor subprocess args; Commander treated it as unknown subcommand option causing exit 1 even when all checks passed (Bug M)
- fix(cli): `gpc quota usage` — use same human-friendly table format as `quota status`; `topCommands` no longer shows `[object Object]` (Bug O)
- fix(core): `sendNotification` — replace `execSync` shell string with `execFile` array args on all platforms; eliminates shell injection via notification title/body (Bug N)
- refactor(cli): extract shared `printQuotaTable()` helper in quota.ts — eliminates duplicate implementation between `quota status` and `quota usage`
- test: add regression tests for bugs H (vitals lmk metrics), M (quickstart spawn args), N (sendNotification execFile), O (quota usage format) — 13 new tests
