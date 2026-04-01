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

GPC pattern-matches Google Play API error responses to provide specific, actionable error messages instead of raw API errors.

#### Upload & Release Errors

| Code | HTTP | What happened | What to do |
| --- | --- | --- | --- |
| `API_DUPLICATE_VERSION_CODE` | 400/403 | Version code already uploaded | Increment `versionCode` in build.gradle and rebuild. Check current: `gpc releases status --track production` |
| `API_VERSION_CODE_TOO_LOW` | 400/403 | Version code lower than current | Google Play requires increasing version codes. Check current: `gpc releases status --track <track>` |
| `API_PACKAGE_NAME_MISMATCH` | 400/403 | AAB package doesn't match target app | Verify `applicationId` in build.gradle matches the app. Check: `gpc config show` |
| `API_BUNDLE_TOO_LARGE` | 400/413 | File exceeds Google's size limit | AAB max: 2 GB, APK max: 1 GB. Check: `gpc preflight <file>` |
| `API_INVALID_BUNDLE` | 400 | Corrupted or malformed AAB/APK | Ensure properly signed. Validate: `gpc preflight <file>`. Rebuild: `./gradlew bundleRelease` |
| `API_RELEASE_NOTES_TOO_LONG` | 400 | Release notes exceed 500 chars | Shorten per language. Preview: `gpc releases notes get --track <track>` |
| `API_ROLLOUT_ALREADY_COMPLETED` | 400 | Release already at 100% rollout | Deploy a new version: `gpc releases upload --track <track>` |

#### Access & Session Errors

| Code | HTTP | What happened | What to do |
| --- | --- | --- | --- |
| `API_APP_NOT_FOUND` | 404 | App not in developer account | Verify package name. List apps: `gpc apps list` |
| `API_TRACK_NOT_FOUND` | 404 | Track doesn't exist | Built-in: internal, alpha, beta, production. List custom: `gpc tracks list` |
| `API_INSUFFICIENT_PERMISSIONS` | 403 | Service account missing permissions | Grant permissions in Play Console → Users and permissions. Verify: `gpc doctor` |
| `API_EDIT_CONFLICT` | 409 | Another edit session open | Wait and retry. GPC auto-retries once. Or discard stale edit in Play Console |
| `API_EDIT_EXPIRED` | 400 | Edit session timed out (~1 hour) | Retry — GPC opens a fresh edit automatically |

#### Review State Errors

| Code | HTTP | What happened | What to do |
| --- | --- | --- | --- |
| `API_CHANGES_NOT_SENT_FOR_REVIEW` | 400/403 | App has a rejected update; API requires acknowledgement | Add `--changes-not-sent-for-review` to your command. Changes are applied but not sent for review. Submit for review manually from the Play Console. |
| `API_CHANGES_ALREADY_IN_REVIEW` | 400 | Changes are already in review; committing would cancel the review | Wait for the current review to complete, or re-run without `--error-if-in-review` to cancel and resubmit. |

#### General API Errors

| Code | HTTP | What happened | What to do |
| --- | --- | --- | --- |
| `API_UNAUTHORIZED` | 401 | Invalid or expired token | Re-authenticate: `gpc auth login`. Run: `gpc doctor` |
| `API_FORBIDDEN` | 403 | Generic permission denied | Check service account permissions. Run: `gpc doctor` |
| `API_NOT_FOUND` | 404 | Resource not found | Verify package name and resource IDs. Run: `gpc apps list` |
| `API_RATE_LIMITED` | 429 | Too many requests | GPC retries automatically with exponential backoff |
| `API_SERVER_ERROR` | 5xx | Google server error | GPC retries automatically with exponential backoff |
| `API_TIMEOUT` | -- | Request exceeded timeout | Increase timeout: `GPC_TIMEOUT=60000` |

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

### "Version code already used" on upload

```
Error [API_DUPLICATE_VERSION_CODE]: Version code 142 has already been uploaded to this app.

  Increment versionCode in your build.gradle (or build.gradle.kts) and rebuild.
  Check the current version with: gpc releases status --track production
```

**Fix:** Open `app/build.gradle` and increment `versionCode`. Rebuild and upload again.

### "Permission denied" on upload

```
Error [API_INSUFFICIENT_PERMISSIONS]: The service account does not have permission for this operation.

  In Google Play Console → Users and permissions → find your service account email.
  Grant the required permissions (e.g., 'Release to production' for uploads).
  Run gpc doctor to verify your credentials and permissions.
```

**Fix:** Go to Play Console → Users and permissions → find the service account email → grant "Release to production" or "Release to testing tracks".

### "No credentials found" in CI

```
Error [AUTH_MISSING_CREDENTIALS]: No authentication credentials found.

  Set GPC_SERVICE_ACCOUNT environment variable or run 'gpc auth login'
```

**Fix:** Ensure the `GPC_SERVICE_ACCOUNT` secret is set in your CI provider and passed as an environment variable to the job.

### "Edit conflict" during release

```
Error [API_EDIT_CONFLICT]: An edit conflict occurred — another edit session is open for this app.

  This usually means another process has an open edit (CI pipeline, Play Console, or another gpc instance).
  Wait a few minutes and retry — GPC will auto-retry once.
  Or discard the stale edit in the Google Play Console.
```

**Fix:** Retry the command. If it persists, ensure no one is making changes in the Play Console web UI while the CI pipeline is running.

### "App not found" on first use

```
Error [API_APP_NOT_FOUND]: This app was not found in your Google Play developer account.

  Verify the package name is correct.
  Ensure the app has been created in the Google Play Console.
  List available apps with: gpc apps list
```

**Fix:** Double-check the package name with `gpc config show`. If the app is new, create it in the Play Console first, then invite the service account.

### "Threshold breach" halting rollout

```
Error [THRESHOLD_CRASH_RATE]: Crash rate 2.4% exceeds threshold 2.0%.

  Investigate crash clusters with 'gpc vitals crashes' and consider halting the rollout.
```

**Fix:** Run `gpc vitals crashes --json` to identify crash clusters. Halt the rollout with `gpc releases rollout halt --track production`.
