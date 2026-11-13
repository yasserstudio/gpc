---
"@gpc-cli/cli": patch
---

`gpc apps info --app <package>` now shows that app instead of the profile's app, as `--app` does on every other command. A malformed package name is rejected with `INVALID_PACKAGE_NAME` before any API call. The `gpc status --threshold` help now states that its values are percent, unlike config thresholds, which are fractions.
