---
"@gpc-cli/cli": minor
"@gpc-cli/api": minor
"@gpc-cli/auth": minor
"@gpc-cli/core": minor
"@gpc-cli/config": minor
"@gpc-cli/plugin-sdk": minor
"@gpc-cli/plugin-ci": minor
---

Phase 9 — Production hardening

- Lazy command loading via dynamic import (faster cold start)
- Global `--dry-run` flag on all 30+ write operations
- Unified error hierarchy: ApiError and AuthError now have exitCode and toJSON()
- Proxy support via `HTTPS_PROXY` / `HTTP_PROXY` with undici ProxyAgent
- Custom CA certificate support via `GPC_CA_CERT`
- 368 total tests across 7 packages
