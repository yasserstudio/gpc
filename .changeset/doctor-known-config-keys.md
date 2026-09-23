---
"@gpc-cli/cli": patch
---

`gpc doctor` no longer reports GPC's own config keys as unknown: the plugin approval keys GPC writes itself, the documented `vitals`, `games`, and `reports` sections, and the path it records for a project config file.
