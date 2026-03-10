---
"@gpc-cli/auth": patch
"@gpc-cli/api": patch
---

Add in-memory token cache with mutex to prevent concurrent refresh races. Move token fetch outside the HTTP retry loop so transient failures no longer trigger redundant token generations.
