---
"@gpc-cli/api": minor
"@gpc-cli/cli": patch
"@gpc-cli/plugin-sdk": patch
---

Wire plugin command-error and HTTP lifecycle hooks into the production CLI, include resolved non-secret options and positional arguments in command events, let plugin authors mark custom command fields as sensitive, and redact credential-bearing request, command, and webhook metadata before observers receive it.
