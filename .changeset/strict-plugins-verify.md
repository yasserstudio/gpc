---
"@gpc-cli/core": minor
"@gpc-cli/config": patch
"@gpc-cli/cli": patch
"@gpc-cli/plugin-ci": patch
---

Enforce third-party permissions from package manifests without allowing exported-name or npm-alias trust spoofing. Already-approved legacy package and stable file identities keep working with a deprecation warning and compatibility permissions, while ambiguous historical relative paths require reapproval and new approvals require explicit metadata. Export the first-party CI plugin through the conventional discovery entry.
