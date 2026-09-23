---
"@gpc-cli/core": patch
---

Require AI SDK releases that include the `@ai-sdk/provider-utils` fix for GHSA-866g-f22w-33x8 (uncontrolled resource consumption), used by `--ai` release-note translation. Installs can no longer resolve a vulnerable version.
