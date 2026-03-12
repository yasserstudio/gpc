---
outline: deep
---

# Troubleshooting

This page covers common issues and their solutions. For a complete list of error codes, see the [Error Codes](./error-codes) reference.

## First Steps

### Run `gpc doctor`

The built-in diagnostic command checks your environment, credentials, and configuration:

```bash
gpc doctor
```

`gpc doctor` validates:
- Node.js version compatibility
- Authentication credentials and token validity
- API access and permissions
- Configuration file syntax
- Network connectivity to Google Play APIs

### Enable Debug Mode

For detailed output, enable debug mode:

```bash
# Environment variable
GPC_DEBUG=1 gpc <command>

# Verbose flag
gpc <command> --verbose
```

Debug mode prints request/response details, timing information, and internal state. Credentials and tokens are automatically redacted.

## Common Issues

### Authentication

#### No credentials found

**Symptom:** `Error [AUTH_001]: No credentials found`

**Cause:** GPC cannot locate a service account key or OAuth token.

**Fix:**
```bash
# Point to your service account key
export GPC_SERVICE_ACCOUNT=/path/to/service-account.json

# Or log in with OAuth
gpc auth login
```

#### Token expired

**Symptom:** `Error [AUTH_003]: Token expired`

**Cause:** Your OAuth token has expired and needs to be refreshed.

**Fix:**
```bash
gpc auth login
```

#### Permission denied

**Symptom:** `Error [AUTH_002]: Permission denied` or `403 Forbidden` on auth

**Cause:** Your service account or user account lacks the required permissions.

**Fix:**
1. Open the [Google Cloud Console](https://console.cloud.google.com/)
2. Verify the Google Play Android Developer API is enabled
3. Check that your service account has the correct roles in Google Play Console under **Users and permissions**

---

### API Errors

#### 403/401 on Vitals or Error Issues commands

**Symptom:** `Error [API_003]: 403 Forbidden` or `401 Unauthorized` when running `gpc vitals errors search`, `gpc vitals anomalies`, or other Reporting API commands.

**Cause:** The Reporting API requires the `playdeveloperreporting` OAuth scope. GPC v0.9.15+ requests both required scopes automatically. If you're using an older cached token, it may only have the `androidpublisher` scope.

**Fix:**
1. Re-authenticate to obtain a token with both scopes:
   ```bash
   gpc auth logout && gpc auth login --service-account /path/to/key.json
   ```
2. If using ADC, re-login with both scopes:
   ```bash
   gcloud auth application-default login \
     --scopes=https://www.googleapis.com/auth/androidpublisher,https://www.googleapis.com/auth/playdeveloperreporting
   ```

#### 404 on Vitals commands

**Symptom:** `Error [API_004]: 404 Not Found` when running `gpc vitals crashes`, `gpc vitals anr`, or other vitals commands.

**Cause:** The Google Play Developer Reporting API is not enabled in your Google Cloud project. Vitals commands use a separate API from the main Android Publisher API.

**Fix:**
1. Enable the Reporting API:
   ```bash
   gcloud services enable playdeveloperreporting.googleapis.com --project YOUR_PROJECT_ID
   ```
   Or open the [Google Cloud Console API Library](https://console.cloud.google.com/apis/library), search for **"Google Play Developer Reporting API"**, and click **Enable**.
2. Wait a few minutes for the change to propagate
3. Retry the vitals command

> **Note:** Your service account must also have the "View app quality information" permission in Google Play Console under **Users and permissions**.

#### 404 App not found

**Symptom:** `Error [API_004]: 404 Not Found`

**Cause:** The package name does not match any app in your developer account.

**Fix:**
```bash
# Verify the package name
gpc apps list

# Check your configured package name
gpc config get app
```

#### 403 Forbidden

**Symptom:** `Error [API_003]: 403 Forbidden`

**Cause:** Your credentials lack API access for the requested operation.

**Fix:**
1. Confirm API access is granted in Google Play Console
2. Check that the service account has permissions for the specific app
3. Verify the Google Play Android Developer API is enabled in Cloud Console

#### 429 Rate limited

**Symptom:** `Error [API_005]: 429 Too Many Requests`

**Cause:** You have exceeded Google Play API rate limits.

**Fix:**
```bash
# Reduce concurrency for batch operations
gpc <command> --concurrency 1

# GPC automatically retries with backoff, but you can wait and retry
```

---

### Network

#### ECONNREFUSED

**Symptom:** `Error [NET_001]: connect ECONNREFUSED`

**Cause:** Cannot connect to Google APIs. Often a proxy or firewall issue.

**Fix:**
```bash
# If behind a proxy, set proxy environment variables
export HTTPS_PROXY=http://proxy.example.com:8080

# Verify connectivity
curl -I https://androidpublisher.googleapis.com
```

#### Certificate error

**Symptom:** `Error [NET_002]: unable to verify the first certificate`

**Cause:** Corporate proxy or custom CA certificate not trusted.

**Fix:**
```bash
# Point to your CA certificate bundle
export GPC_CA_CERT=/path/to/ca-bundle.crt

# Or for Node.js
export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt
```

#### DNS resolution failed

**Symptom:** `Error [NET_003]: getaddrinfo ENOTFOUND`

**Cause:** DNS cannot resolve Google API hostnames.

**Fix:**
- Check your network connection
- Verify DNS settings
- Try a public DNS server (e.g., `8.8.8.8`)

---

### Configuration

#### Profile not found

**Symptom:** `Error [CFG_002]: Profile "production" not found`

**Cause:** The specified profile does not exist in your configuration.

**Fix:**
```bash
# List available profiles
gpc config profiles

# Check current profile
echo $GPC_PROFILE

# Create the profile
gpc config set --profile production app com.example.app
```

#### Config parse error

**Symptom:** `Error [CFG_001]: Failed to parse config file`

**Cause:** The configuration file contains invalid JSON or YAML.

**Fix:**
```bash
# Validate your config file
gpc doctor

# Check the file manually
cat ~/.config/gpc/config.json | jq .
```

---

### CI/CD

#### Non-interactive mode

**Symptom:** `Error: Prompts are not supported in non-interactive mode`

**Cause:** GPC is trying to prompt for input in a CI environment.

**Fix:**
```bash
# Disable interactive prompts
export GPC_NO_INTERACTIVE=1
```

#### Missing step summary

**Symptom:** GitHub Actions step summary not appearing.

**Cause:** The `GITHUB_STEP_SUMMARY` environment variable is not available.

**Fix:**
- Ensure you are running inside a GitHub Actions workflow
- Check that the step has write permissions to the summary file
- Verify the `--json` flag is set for structured output

### Output Formatting

#### Table or markdown output shows `[object Object]`

**Symptom:** When using `--output table` or `--output markdown`, columns containing nested objects display `[object Object]` instead of actual values.

**Cause:** Fixed in v0.9.18. Earlier versions did not serialize nested objects before rendering them in table or markdown format.

**Fix:** Update to v0.9.18 or later:
```bash
npm install -g @gpc-cli/cli@latest
```

---

## Getting More Help

- [Error Codes Reference](./error-codes) -- full catalog of error codes and meanings
- [Exit Codes](../reference/exit-codes) -- process exit code reference
- [Environment Variables](../reference/environment-variables) -- all supported env vars
- [GitHub Issues](https://github.com/yasserstudio/gpc/issues) -- report bugs or request features
