---
outline: deep
---

# Exit Codes

GPC uses semantic exit codes so CI pipelines can distinguish error types and react accordingly.

## Exit Code Reference

| Code | Name             | Meaning                                                                                | CI Action                              |
| ---- | ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| `0`  | Success          | Command completed successfully                                                         | Continue pipeline                      |
| `1`  | General Error    | Unexpected error, config error, plugin runtime error, or unhandled exception           | Fail and investigate                   |
| `2`  | Usage Error      | Invalid arguments, unknown flag, missing required option                               | Fix command syntax                     |
| `3`  | Auth Error       | No credentials, expired token, invalid key, revoked access                             | Re-authenticate or check secrets       |
| `4`  | API Error        | Google Play API returned an error (rate limit, permission denied, not found, conflict) | Check permissions or retry             |
| `5`  | Network Error    | DNS failure, timeout, connection refused, proxy error                                  | Check connectivity                     |
| `6`  | Threshold Breach | Vitals metric exceeded threshold, or `preflight --fail-on` severity breached           | Halt rollout or fix preflight findings |

Plugin errors surface as exit code `1` (general error) with a `PLUGIN_*` error code in the JSON output. There is no dedicated plugin exit code at the moment.

## CI Scripting Patterns

### Bash: Branch on Exit Code

```bash
gpc releases upload app.aab --track production --rollout 10
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "Upload successful" ;;
  3) echo "Auth failed, check GPC_SERVICE_ACCOUNT"; exit 1 ;;
  4) echo "API error, check permissions"; exit 1 ;;
  5) echo "Network error, retrying..."; sleep 10; gpc releases upload app.aab --track production --rollout 10 ;;
  6) echo "Vitals threshold breached, halting"; gpc releases rollout halt --track production; exit 1 ;;
  *) echo "Unexpected error (code $EXIT_CODE)"; exit 1 ;;
esac
```

### GitHub Actions: Conditional Steps

```yaml
- name: Upload to production
  id: upload
  continue-on-error: true
  run: gpc releases upload app.aab --track production --rollout 10

- name: Handle auth failure
  if: steps.upload.outcome == 'failure' && steps.upload.outputs.exit-code == 3
  run: echo "::error::Authentication failed. Check GPC_SERVICE_ACCOUNT secret."

- name: Handle threshold breach
  if: steps.upload.outcome == 'failure' && steps.upload.outputs.exit-code == 6
  run: |
    echo "::warning::Vitals threshold breached. Halting rollout."
    gpc releases rollout halt --track production
```

### Vitals Gating (Exit Code 6)

```bash
# Gate deployment on crash rate
gpc vitals crashes --threshold 2.0
# Exit code 0: crash rate is below 2.0%, safe to proceed
# Exit code 6: crash rate is at or above 2.0%, do not proceed

# Gate on multiple metrics
gpc vitals crashes --threshold 2.0 && \
gpc vitals anr --threshold 0.5 && \
echo "All vitals within thresholds" || \
echo "Vitals breached, halting deployment"
```

## JSON Error Format

When an error occurs with `--output json`, the response follows this structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_KEY",
    "message": "Service account JSON is malformed",
    "suggestion": "Download a fresh key from Google Cloud Console"
  }
}
```

### Error Code Prefixes

| Prefix      | Category                    | Exit Code |
| ----------- | --------------------------- | --------- |
| `AUTH_*`    | Authentication errors       | 3         |
| `API_*`     | Google Play API errors      | 4         |
| `CONFIG_*`  | Configuration errors        | 1         |
| `UPLOAD_*`  | File upload errors          | 4         |
| `NETWORK_*` | Network / connectivity      | 5         |
| `PLUGIN_*`  | Plugin system errors        | 1         |

### Common Error Codes

| Code                           | Cause                                            | Fix                                                   |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| `AUTH_NO_CREDENTIALS`          | No service account or OAuth configured           | Run `gpc auth login --service-account path/to/key.json` |
| `AUTH_INVALID_KEY`             | Service account JSON is malformed                | Download a fresh key from Google Cloud Console        |
| `AUTH_FILE_NOT_FOUND`          | Key file path does not exist                     | Check the path in `GPC_SERVICE_ACCOUNT` or config     |
| `AUTH_TOKEN_FAILED`            | Could not obtain access token                    | Verify key is valid and not revoked                   |
| `AUTH_CACHE_INVALID`           | Token cache file is corrupt                      | Run `gpc cache clear` and re-authenticate             |
| `API_UNAUTHORIZED`             | 401 error: invalid or expired token              | Re-authenticate                                       |
| `API_FORBIDDEN`                | 403 error: insufficient permissions              | Check service account permissions in Play Console     |
| `API_INSUFFICIENT_PERMISSIONS` | 403 error: specific permission missing for this action | Grant the required permission in Play Console    |
| `API_NOT_FOUND`                | 404 error: resource does not exist               | Verify package name and resource IDs                  |
| `API_APP_NOT_FOUND`            | The configured app has no Play Console listing   | Create a draft listing or check the package name      |
| `API_TRACK_NOT_FOUND`          | Named track does not exist on this app           | Run `gpc tracks list` to see valid tracks             |
| `API_EDIT_CONFLICT`            | 409 error: another edit is already in progress   | Delete the existing edit and retry                    |
| `API_EDIT_EXPIRED`             | Edit session exceeded 14-day lifetime            | Run the command again; GPC creates a new edit         |
| `API_CHANGES_ALREADY_IN_REVIEW`| Track has a release already in review            | Wait for Google to finish reviewing, or use `--error-if-in-review` |
| `API_CHANGES_NOT_SENT_FOR_REVIEW` | App rejected; changes not submitted           | Use `--changes-not-sent-for-review` flag              |
| `API_DUPLICATE_VERSION_CODE`   | Uploaded bundle uses a versionCode already on Play | Bump versionCode in your build config              |
| `API_VERSION_CODE_TOO_LOW`     | Uploaded versionCode is lower than any existing release | Bump versionCode                               |
| `API_BUNDLE_TOO_LARGE`         | AAB exceeds 2 GB                                 | Trim assets or split via dynamic delivery             |
| `API_INVALID_BUNDLE`           | AAB fails Google Play validation                 | Check the Play Console validation output              |
| `API_RELEASE_NOTES_TOO_LONG`   | Release notes exceed 500 characters per locale   | Trim notes                                            |
| `API_ROLLOUT_ALREADY_COMPLETED`| Cannot modify a completed rollout                | Start a new release                                   |
| `API_PACKAGE_NAME_MISMATCH`    | Bundle package name does not match the target app | Verify `--app` matches the AAB's package             |
| `API_RATE_LIMITED`             | 429 error: too many requests                     | GPC retries automatically; reduce concurrent requests |
| `API_SERVER_ERROR`             | 5xx error: Google server error                   | GPC retries automatically                             |
| `API_TIMEOUT`                  | Request exceeded timeout                         | Increase `GPC_TIMEOUT` or check network               |
| `API_NETWORK_ERROR`            | Connection failed                                | Check internet connection and proxy settings          |
| `API_PRICING_UNAVAILABLE`      | Requested region price conversion failed         | Confirm the region supports paid distribution         |
| `API_EMPTY_RESPONSE`           | Google returned an empty response body           | Retry; report if persistent                           |
| `UPLOAD_INITIATE_FAILED`       | Could not start resumable upload                 | Check credentials and package name                    |
| `UPLOAD_NO_SESSION_URI`        | Google did not return a session URI on initiation | Retry; check network                                |
| `UPLOAD_SESSION_EXPIRED`       | Upload session is gone (410)                     | Start a new upload from the beginning                 |
| `UPLOAD_CHUNK_FAILED`          | Chunk upload failed after max retries            | Retry; session URI is valid for 1 week                |
| `UPLOAD_NO_COMPLETION`         | Upload finished but no completion response       | Retry; usually indicates a server-side hiccup         |
| `UPLOAD_INVALID_CHUNK_SIZE`    | Chunk size not a multiple of 256 KB              | Use a valid chunk size (e.g., 8388608 for 8 MB)       |
| `CONFIG_INVALID_KEY`           | Config key is malformed or reserved              | Use a valid dotted path (e.g., `auth.serviceAccount`) |
| `CONFIG_INVALID_VALUE`         | Config value failed validation                   | Run `gpc config show` to see resolved config          |
| `CONFIG_PROFILE_NOT_FOUND`     | Named profile does not exist                     | Run `gpc auth profiles` to list profiles              |
| `PLUGIN_INVALID_PERMISSION`    | Plugin requests unknown permission               | Check plugin manifest                                 |
