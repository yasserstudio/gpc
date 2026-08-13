---
"@gpc-cli/core": minor
"@gpc-cli/config": patch
"@gpc-cli/cli": patch
"@gpc-cli/plugin-ci": patch
---

Enforce third-party permissions from package manifests without allowing exported-name or npm-alias trust spoofing. Already-approved legacy package and stable file identities keep working with a deprecation warning and compatibility permissions, while ambiguous historical relative paths require reapproval and new approvals require explicit metadata. Export the first-party CI plugin through the conventional discovery entry.

A plugin loaded from a loose file is now identified by its path rather than by whichever project encloses it, so `gpc plugins list` no longer attributes it to an unrelated package name. A package that sits beside the module, or that opts in by declaring `gpc.permissions`, still reports its own identity as before.
