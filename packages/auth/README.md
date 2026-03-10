# @gpc-cli/auth

Authentication strategies for Google Play Developer API. Supports service accounts, OAuth 2.0, and Application Default Credentials.

## Install

```bash
npm install @gpc-cli/auth
```

## Usage

```typescript
import { resolveAuth, createServiceAccountAuth, loadServiceAccountKey } from "@gpc-cli/auth";

// Auto-resolve from config
const auth = await resolveAuth({
  serviceAccount: "./service-account.json",
});

// Or create directly
const key = loadServiceAccountKey("./service-account.json");
const auth = createServiceAccountAuth(key);

// Use with @gpc-cli/api
import { createApiClient } from "@gpc-cli/api";
const client = createApiClient({ auth });
```

## Auth Methods

| Method          | Best For           | Config                               |
| --------------- | ------------------ | ------------------------------------ |
| Service account | CI/CD, automation  | `serviceAccount` path or JSON string |
| OAuth 2.0       | Local development  | Interactive login flow               |
| ADC             | GCP-hosted runners | `GPC_USE_ADC=1` or `--adc` flag      |
| Env var         | Docker, ephemeral  | `GPC_SERVICE_ACCOUNT` env var        |

## API

### `resolveAuth(options)`

Resolves the auth strategy from config options. Tries service account, then ADC, then cached OAuth tokens.

### `loadServiceAccountKey(pathOrJson)`

Loads and validates a service account key from a file path or JSON string.

### `createServiceAccountAuth(key)`

Creates an auth client from a parsed service account key. Handles token generation and caching.

### `clearTokenCache()`

Clears all cached OAuth/service account tokens.

## Part of the GPC Monorepo

This is the auth layer for [GPC](https://github.com/yasserstudio/gpc). Use it standalone or with `@gpc-cli/api`.

## License

MIT
