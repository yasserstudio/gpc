---
"gpc": minor
"@gpc/api": minor
"@gpc/auth": minor
"@gpc/core": minor
"@gpc/config": minor
"@gpc/plugin-sdk": minor
"@gpc/plugin-ci": minor
---

Phase 9 — Production hardening

- Lazy command loading via dynamic import (faster cold start)
- Global `--dry-run` flag on all 30+ write operations
- Unified error hierarchy: ApiError and AuthError now have exitCode and toJSON()
- Proxy support via `HTTPS_PROXY` / `HTTP_PROXY` with undici ProxyAgent
- Custom CA certificate support via `GPC_CA_CERT`
- 368 total tests across 7 packages
