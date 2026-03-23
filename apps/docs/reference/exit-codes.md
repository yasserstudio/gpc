---
outline: deep
---

# Exit Codes

GPC uses semantic exit codes so CI pipelines can distinguish error types and react accordingly.

## Exit Code Reference

| Code | Name             | Meaning                                                                                | CI Action                        |
| ---- | ---------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| `0`  | Success          | Command completed successfully                                                         | Continue pipeline                |
| `1`  | General Error    | Unexpected error, unhandled exception                                                  | Fail and investigate             |
| `2`  | Usage Error      | Invalid arguments, unknown flag, missing required option                               | Fix command syntax               |
| `3`  | Auth Error       | No credentials, expired token, invalid key, revoked access                             | Re-authenticate or check secrets |
| `4`  | API Error        | Google Play API returned an error (rate limit, permission denied, not found, conflict) | Check permissions or retry       |
| `5`  | Network Error    | DNS failure, timeout, connection refused, proxy error                                  | Check connectivity               |
| `6`  | Threshold Breach | Vitals metric exceeded threshold, or `preflight --fail-on` severity breached           | Halt rollout or fix preflight findings |
| `10` | Plugin Error     | Plugin failed to load, invalid permissions, runtime error in plugin                    | Check plugin config              |

## CI Scripting Patterns

### Bash: Branch on Exit Code

```bash
gpc releases upload app.aab --track production --rollout 10
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "Upload successful" ;;
  3) echo "Auth failed — check GPC_SERVICE_ACCOUNT"; exit 1 ;;
  4) echo "API error — check permissions"; exit 1 ;;
  5) echo "Network error — retrying..."; sleep 10; gpc releases upload app.aab --track production --rollout 10 ;;
  6) echo "Vitals threshold breached — halting"; gpc releases rollout halt --track production; exit 1 ;;
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
# Exit code 0 = crash rate is below 2.0% — safe to proceed
# Exit code 6 = crash rate is at or above 2.0% — do not proceed

# Gate on multiple metrics
gpc vitals crashes --threshold 2.0 && \
gpc vitals anr --threshold 0.5 && \
echo "All vitals within thresholds" || \
echo "Vitals breached — halting deployment"
```

## JSON Error Format

When an error occurs with `--output json`, the response follows this structure:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Access token has expired",
    "suggestion": "Run 'gpc auth login' to re-authenticate"
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
| `NETWORK_*` | Network/connectivity errors | 5         |
| `PLUGIN_*`  | Plugin system errors        | 10        |

### Common Error Codes

| Code                        | Cause                                   | Fix                                                   |
| --------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `AUTH_INVALID_KEY`          | Service account JSON is malformed       | Download a fresh key from Google Cloud Console        |
| `AUTH_FILE_NOT_FOUND`       | Key file path does not exist            | Check the path in `GPC_SERVICE_ACCOUNT` or config     |
| `AUTH_TOKEN_FAILED`         | Could not obtain access token           | Verify key is valid and not revoked                   |
| `AUTH_EXPIRED`              | Access token expired and refresh failed | Run `gpc auth login`                                  |
| `API_UNAUTHORIZED`          | 401 — invalid or expired token          | Re-authenticate                                       |
| `API_FORBIDDEN`             | 403 — insufficient permissions          | Check service account permissions in Play Console     |
| `API_NOT_FOUND`             | 404 — resource does not exist           | Verify package name and resource IDs                  |
| `API_EDIT_CONFLICT`         | 409 — another edit in progress          | Delete existing edit and retry                        |
| `API_RATE_LIMITED`          | 429 — too many requests                 | GPC retries automatically; reduce concurrent requests |
| `API_SERVER_ERROR`          | 5xx — Google server error               | GPC retries automatically                             |
| `API_TIMEOUT`               | Request exceeded timeout                | Increase `GPC_TIMEOUT` or check network               |
| `API_NETWORK_ERROR`         | Connection failed                       | Check internet connection and proxy settings          |
| `UPLOAD_INITIATE_FAILED`    | Could not start resumable upload        | Check credentials and package name                    |
| `UPLOAD_SESSION_NOT_FOUND`  | Upload session expired or invalid (404) | Start a new upload                                    |
| `UPLOAD_SESSION_EXPIRED`    | Upload session is gone (410)            | Start a new upload from the beginning                 |
| `UPLOAD_CHUNK_FAILED`       | Chunk upload failed after max retries   | Retry; session URI is valid for 1 week                |
| `UPLOAD_INVALID_CHUNK_SIZE` | Chunk size not a multiple of 256 KB     | Use a valid chunk size (e.g., 8388608 for 8 MB)       |
| `CONFIG_INVALID`            | Config file has invalid schema          | Run `gpc config show` to see resolved config          |
| `PLUGIN_INVALID_PERMISSION` | Plugin requests unknown permission      | Check plugin manifest                                 |
