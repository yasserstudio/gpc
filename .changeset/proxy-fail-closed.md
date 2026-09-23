---
"@gpc-cli/cli": patch
---

Proxy support is now reliable and safe on npm installs. `HTTPS_PROXY` / `HTTP_PROXY` are applied through a bundled dependency instead of one that happened to be installed, `NO_PROXY` is honored, and a proxy that cannot be applied stops the command with `NETWORK_ERROR` (exit 5) instead of silently sending requests, and their OAuth tokens, around it. Proxy URLs are no longer printed in errors or `gpc doctor` output.
