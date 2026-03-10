---
outline: deep
---

# Error Codes

GPC uses structured error handling with deterministic exit codes and machine-readable error objects. Every error includes a code, message, and suggestion for how to fix it.

## Exit Codes

| Code | Name             | Meaning                           | CI Action                                |
| ---- | ---------------- | --------------------------------- | ---------------------------------------- |
| `0`  | Success          | Command completed successfully    | Continue pipeline                        |
| `1`  | General Error    | Unclassified error                | Fail the job, investigate                |
| `2`  | Usage Error      | Invalid arguments or flags        | Fix the command invocation               |
| `3`  | Auth Error       | Authentication failed             | Check `GPC_SERVICE_ACCOUNT` secret       |
| `4`  | API Error        | Google Play API returned an error | Check permissions, retry if rate limited |
| `5`  | Network Error    | Network connectivity issue        | Retry the step                           |
| `6`  | Threshold Breach | Vitals metric exceeded threshold  | Halt rollout, alert team                 |
| `10` | Plugin Error     | Plugin failed to load or execute  | Check plugin configuration               |

### Using Exit Codes in CI Scripts

```bash
#!/bin/bash
# exit-code-handler.sh
gpc releases upload app.aab --track internal --json
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "Upload successful"
    ;;
  2)
    echo "Invalid arguments. Check command syntax."
    exit 2
    ;;
  3)
    echo "Auth failed. Is GPC_SERVICE_ACCOUNT set correctly?"
    exit 3
    ;;
  4)
    echo "API error. Check Play Console permissions."
    exit 4
    ;;
  5)
    echo "Network error. Retrying..."
    gpc releases upload app.aab --track internal --json
    ;;
  6)
    echo "Vitals threshold breached. Halting rollout."
    gpc releases rollout halt --track production --json
    exit 6
    ;;
  10)
    echo "Plugin error. Check plugin installation."
    exit 10
    ;;
  *)
    echo "Unexpected error: $EXIT_CODE"
    exit 1
    ;;
esac
```

### GitHub Actions Step Conditional

```yaml
- name: Upload release
  id: upload
  run: gpc releases upload app.aab --track internal --json
  continue-on-error: true

- name: Handle auth failure
  if: steps.upload.outcome == 'failure'
  run: |
    echo "::error::Upload failed. Check GPC_SERVICE_ACCOUNT and Play Console permissions."
    exit 1
```

## JSON Error Format

When a command fails, JSON output follows this structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Access token has expired",
    "suggestion": "Run 'gpc auth login' to re-authenticate"
  }
}
```

| Field              | Type      | Description                       |
| ------------------ | --------- | --------------------------------- |
| `success`          | `boolean` | Always `false` for errors         |
| `error.code`       | `string`  | Machine-readable error identifier |
| `error.message`    | `string`  | Human-readable description        |
| `error.suggestion` | `string`  | Actionable fix (when available)   |

Parse errors in CI scripts:

```bash
RESULT=$(gpc releases status --json 2>&1) || true
ERROR_CODE=$(echo "$RESULT" | jq -r '.error.code // empty')

if [[ -n "$ERROR_CODE" ]]; then
  SUGGESTION=$(echo "$RESULT" | jq -r '.error.suggestion // "No suggestion available"')
  echo "Error: $ERROR_CODE — $SUGGESTION"
fi
```

## Error Code Prefixes

Error codes are namespaced by prefix to indicate the subsystem that generated the error.

### AUTH\_\* -- Authentication Errors

Exit code: `3`

| Code                       | Message                  | Cause                                  | Fix                                               |
| -------------------------- | ------------------------ | -------------------------------------- | ------------------------------------------------- |
| `AUTH_TOKEN_EXPIRED`       | Access token has expired | Token TTL exceeded                     | Run `gpc auth login` or check service account     |
| `AUTH_INVALID_CREDENTIALS` | Invalid credentials      | Malformed service account JSON         | Verify JSON file is valid and complete            |
| `AUTH_MISSING_CREDENTIALS` | No credentials found     | No auth method configured              | Set `GPC_SERVICE_ACCOUNT` or run `gpc auth login` |
| `AUTH_INSUFFICIENT_SCOPE`  | Insufficient scopes      | Token missing required scope           | Re-authenticate with correct scopes               |
| `AUTH_REFRESH_FAILED`      | Token refresh failed     | Refresh token revoked or expired       | Run `gpc auth login` again                        |
| `AUTH_KEYFILE_NOT_FOUND`   | Key file not found       | File path in config does not exist     | Check `GPC_SERVICE_ACCOUNT` path                  |
| `AUTH_KEYFILE_INVALID`     | Invalid key file format  | File is not valid service account JSON | Download a fresh key from Google Cloud Console    |

### API\_\* -- Google Play API Errors

Exit code: `4`

| Code                      | HTTP Status | Cause                                     | Fix                                            |
| ------------------------- | ----------- | ----------------------------------------- | ---------------------------------------------- |
| `API_RATE_LIMITED`        | 429         | Too many requests                         | Wait and retry; reduce `GPC_RATE_LIMIT`        |
| `API_NOT_FOUND`           | 404         | Resource not found                        | Verify the package name or resource exists     |
| `API_PERMISSION_DENIED`   | 403         | Service account lacks required permission | Grant permission in Play Console > Users       |
| `API_UNAUTHORIZED`        | 401         | Invalid or expired token                  | Re-authenticate                                |
| `API_VALIDATION_FAILED`   | 400         | Edit validation failed before commit      | Check error details for specific field issues  |
| `API_EDIT_CONFLICT`       | 409         | Another edit in progress or Console used  | Retry the operation (GPC creates fresh edits)  |
| `API_QUOTA_EXCEEDED`      | 429         | Daily or per-minute quota hit             | Wait for quota reset or request increase       |
| `API_INVALID_ARGUMENT`    | 400         | API rejected a field value                | Check the error message for the specific field |
| `API_PRECONDITION_FAILED` | 412         | Required state not met                    | Check release status, version codes, etc.      |
| `API_SERVER_ERROR`        | 5xx         | Google server error                       | Auto-retried with exponential backoff          |
| `API_TIMEOUT`             | --          | Request exceeded timeout                  | Increase `GPC_TIMEOUT`                         |

### CONFIG\_\* -- Configuration Errors

Exit code: `2`

| Code                          | Message               | Cause                                   | Fix                                             |
| ----------------------------- | --------------------- | --------------------------------------- | ----------------------------------------------- |
| `CONFIG_NOT_FOUND`            | Config file not found | No `.gpcrc.json` in project or user dir | Run `gpc config init`                           |
| `CONFIG_VALIDATION_ERROR`     | Invalid config        | Config file has invalid fields          | Run `gpc config show` to inspect                |
| `CONFIG_MISSING_APP`          | No app specified      | `--app` flag and `GPC_APP` both missing | Set `GPC_APP` or pass `--app`                   |
| `CONFIG_MISSING_DEVELOPER_ID` | No developer ID       | Required for user/grant commands        | Set `GPC_DEVELOPER_ID` or pass `--developer-id` |

### UPLOAD\_\* -- Upload Errors

Exit code: `1`

| Code                       | Message                 | Cause                                 | Fix                                        |
| -------------------------- | ----------------------- | ------------------------------------- | ------------------------------------------ |
| `UPLOAD_FILE_NOT_FOUND`    | File not found          | Upload file path does not exist       | Check the file path                        |
| `UPLOAD_INVALID_FORMAT`    | Invalid file format     | File is not a valid AAB or APK        | Verify the file was built correctly        |
| `UPLOAD_FILE_TOO_LARGE`    | File exceeds size limit | AAB/APK over 150MB                    | Reduce bundle size or use dynamic delivery |
| `UPLOAD_DUPLICATE_VERSION` | Duplicate version code  | Version code already used             | Increment `versionCode` in build.gradle    |
| `UPLOAD_MAPPING_INVALID`   | Invalid mapping file    | ProGuard/R8 mapping file is malformed | Check the mapping file format              |

### PLUGIN\_\* -- Plugin Errors

Exit code: `10`

| Code                        | Message               | Cause                               | Fix                                           |
| --------------------------- | --------------------- | ----------------------------------- | --------------------------------------------- |
| `PLUGIN_NOT_FOUND`          | Plugin not found      | Plugin package not installed        | Install the plugin: `npm install <plugin>`    |
| `PLUGIN_INVALID_PERMISSION` | Invalid permission    | Plugin requests unknown permission  | Update the plugin or report to the author     |
| `PLUGIN_PERMISSION_DENIED`  | Permission denied     | Plugin not approved by user         | Run `gpc plugins approve <name>`              |
| `PLUGIN_LOAD_FAILED`        | Failed to load plugin | Plugin has syntax or runtime errors | Check plugin code or update to latest version |
| `PLUGIN_HOOK_FAILED`        | Hook execution failed | Plugin hook threw an error          | Check plugin logs; error is non-fatal         |

### NETWORK\_\* -- Network Errors

Exit code: `5`

| Code                         | Message               | Cause                            | Fix                                           |
| ---------------------------- | --------------------- | -------------------------------- | --------------------------------------------- |
| `NETWORK_TIMEOUT`            | Request timed out     | Server did not respond in time   | Increase `GPC_TIMEOUT` or retry               |
| `NETWORK_CONNECTION_REFUSED` | Connection refused    | Cannot reach API endpoint        | Check network connectivity and proxy settings |
| `NETWORK_DNS_FAILURE`        | DNS resolution failed | Cannot resolve API hostname      | Check DNS configuration                       |
| `NETWORK_PROXY_ERROR`        | Proxy error           | HTTPS proxy rejected the request | Check `HTTPS_PROXY` configuration             |
| `NETWORK_TLS_ERROR`          | TLS error             | Certificate validation failed    | Check `GPC_CA_CERT` or system certificates    |

### THRESHOLD\_\* -- Vitals Threshold Errors

Exit code: `6`

| Code                   | Message                       | Cause                                  | Fix                               |
| ---------------------- | ----------------------------- | -------------------------------------- | --------------------------------- |
| `THRESHOLD_CRASH_RATE` | Crash rate threshold breached | Crash rate exceeds `--threshold` value | Investigate crashes, halt rollout |
| `THRESHOLD_ANR_RATE`   | ANR rate threshold breached   | ANR rate exceeds `--threshold` value   | Investigate ANRs, halt rollout    |

## Error Class Hierarchy

GPC uses a typed error hierarchy. All errors extend the base `GpcError` class.

```
GpcError (base)
├── AuthError
│   ├── TokenExpiredError
│   ├── InvalidCredentialsError
│   └── MissingCredentialsError
├── ApiError
│   ├── RateLimitError
│   ├── NotFoundError
│   ├── PermissionDeniedError
│   └── ValidationError
├── ConfigError
│   ├── ConfigNotFoundError
│   └── ConfigValidationError
└── PluginError
```

Every error instance includes:

```typescript
interface GpcError {
  code: string; // e.g., "AUTH_TOKEN_EXPIRED"
  message: string; // Human-readable description
  suggestion: string; // Actionable fix
  exitCode: number; // Process exit code (1-6, 10)
}
```

## Common Error Scenarios

### "Permission denied" on upload

```
Error: API_PERMISSION_DENIED
Message: The caller does not have permission
Suggestion: Grant 'Release apps to testing tracks' to the service account in Play Console
```

**Fix:** Go to Play Console > Users and permissions > invite the service account email > grant "Release apps to testing tracks" (or "Release to production" for production track).

### "No credentials found" in CI

```
Error: AUTH_MISSING_CREDENTIALS
Message: No authentication credentials found
Suggestion: Set GPC_SERVICE_ACCOUNT environment variable or run 'gpc auth login'
```

**Fix:** Ensure the `GPC_SERVICE_ACCOUNT` secret is set in your CI provider and passed as an environment variable to the job.

### "Edit conflict" during release

```
Error: API_EDIT_CONFLICT
Message: Edit was invalidated by a concurrent change
Suggestion: Retry the operation. Avoid making changes in Play Console during CI releases.
```

**Fix:** Retry the command. If it persists, ensure no one is making changes in the Play Console web UI while the CI pipeline is running.

### "Threshold breach" halting rollout

```
Error: THRESHOLD_CRASH_RATE
Message: Crash rate 2.4% exceeds threshold 2.0%
Suggestion: Investigate crash clusters with 'gpc vitals crashes' and consider halting the rollout
```

**Fix:** Run `gpc vitals crashes --json` to identify crash clusters. Consider halting the rollout with `gpc releases rollout halt --track production`.
