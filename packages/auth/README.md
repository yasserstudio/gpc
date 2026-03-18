# @gpc-cli/auth

Authentication for the Google Play Developer API. Part of [GPC](https://github.com/yasserstudio/gpc).

Service account, OAuth, and Application Default Credentials — with automatic token caching and a simple `AuthClient` interface. Works with your existing Google Play service account; no new credentials or extra permissions needed.

## Install

```bash
npm install @gpc-cli/auth
```

## Quick Start

```typescript
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";

const auth = await resolveAuth({
  serviceAccountPath: "./service-account.json",
});

const client = createApiClient({ auth });
```

## Authentication Methods

### Service Account (file path)

The most common method for CI/CD and automation. Download a service account JSON key from the Google Cloud Console.

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccountPath: "./service-account.json",
});
```

### Service Account (JSON string)

Pass the key contents directly -- useful for environment variables and secrets managers.

```typescript
import { resolveAuth } from "@gpc-cli/auth";

const auth = await resolveAuth({
  serviceAccountJson: process.env.SERVICE_ACCOUNT_KEY,
});
```

### Service Account (manual creation)

For more control, load and create the auth client in two steps:

```typescript
import { loadServiceAccountKey, createServiceAccountAuth } from "@gpc-cli/auth";

const key = await loadServiceAccountKey("./service-account.json");
const auth = createServiceAccountAuth(key);

console.log(auth.getClientEmail()); // your-sa@project.iam.gserviceaccount.com
console.log(auth.getProjectId());   // your-gcp-project-id
```

`loadServiceAccountKey` accepts a file path or a raw JSON string, and validates the key structure before returning.

### Application Default Credentials

Works automatically in GCP-hosted environments (Cloud Build, Cloud Run, GKE) and locally after running `gcloud auth application-default login`.

```typescript
import { resolveAuth } from "@gpc-cli/auth";

// No options needed -- resolveAuth falls back to ADC automatically
const auth = await resolveAuth();
```

### Environment Variables

`resolveAuth` checks these environment variables when no explicit options are provided:

| Variable | Description |
| --- | --- |
| `GPC_SERVICE_ACCOUNT` | File path or raw JSON string of a service account key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Standard GCP credential path (also used by ADC) |

### Resolution Order

`resolveAuth` tries credentials in this order:

1. `serviceAccountJson` option (inline JSON)
2. `serviceAccountPath` option (file path)
3. `GPC_SERVICE_ACCOUNT` environment variable
4. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
5. Application Default Credentials

The first method that succeeds is used.

## Token Caching

Access tokens are cached in memory and reused until they expire. This avoids redundant token requests when making multiple API calls.

To clear the cache manually:

```typescript
import { clearTokenCache } from "@gpc-cli/auth";

clearTokenCache();
```

## AuthClient Interface

Every auth method returns an `AuthClient`:

```typescript
interface AuthClient {
  getAccessToken(): Promise<string>;
  getProjectId(): string | undefined;
  getClientEmail(): string;
}
```

This is the interface that `@gpc-cli/api` expects. You can also implement it yourself for custom auth flows:

```typescript
import { createApiClient } from "@gpc-cli/api";

const client = createApiClient({
  auth: {
    async getAccessToken() {
      return fetchTokenFromVault();
    },
    getProjectId() { return "my-project"; },
    getClientEmail() { return "custom@example.com"; },
  },
});
```

## Type Exports

```typescript
import type { AuthOptions, AuthClient, ServiceAccountKey } from "@gpc-cli/auth";
```

## Error Handling

Auth failures throw `AuthError` with a code and actionable suggestion:

```typescript
import { AuthError } from "@gpc-cli/auth";

try {
  const auth = await resolveAuth();
} catch (error) {
  if (error instanceof AuthError) {
    console.error(error.code);       // e.g. "AUTH_NO_CREDENTIALS"
    console.error(error.suggestion); // step-by-step fix
    console.error(error.toJSON());   // structured error object
  }
}
```

Error codes:

| Code | Meaning |
| --- | --- |
| `AUTH_NO_CREDENTIALS` | No credentials found via any method |
| `AUTH_INVALID_KEY` | Service account key is malformed or missing required fields |
| `AUTH_TOKEN_FAILED` | Token generation failed (expired key, wrong permissions, network) |
| `AUTH_FILE_NOT_FOUND` | Service account file path does not exist |

## Documentation

- [Full documentation](https://yasserstudio.github.io/gpc/)
- [SDK usage guide](https://yasserstudio.github.io/gpc/advanced/sdk-usage.html)

## License

MIT
