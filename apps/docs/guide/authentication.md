---
outline: deep
---

# Authentication

GPC supports four authentication methods. Service accounts are recommended for CI/CD; OAuth is available for interactive use.

| Method                                                              | Best For             | Requires                    | Interactive |
| ------------------------------------------------------------------- | -------------------- | --------------------------- | ----------- |
| [Service account](#service-account)                                 | CI/CD, automation    | JSON key file               | No          |
| [OAuth 2.0](#oauth-2-0)                                             | Developer machines   | Google account              | Yes         |
| [Environment variable](#environment-variable)                       | CI/CD secrets        | `GPC_SERVICE_ACCOUNT`       | No          |
| [Application Default Credentials](#application-default-credentials) | GCP-hosted workloads | `gcloud` or metadata server | No          |

## Google Cloud Setup

All authentication methods require a Google Cloud project with the Google Play Developer API enabled and appropriate Play Console access.

### Step 1: Create a Google Cloud Project

Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or use an existing one).

```
Project name: my-play-deploy
Project ID:   my-play-deploy-123456
```

### Step 2: Enable the Google Play Developer API

```bash
gcloud services enable androidpublisher.googleapis.com --project my-play-deploy-123456
```

Or enable it in the [API Library](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com).

### Step 3: Create a Service Account

```bash
gcloud iam service-accounts create play-deploy \
  --display-name "Play Store Deploy" \
  --project my-play-deploy-123456
```

### Step 4: Download the JSON Key File

```bash
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account play-deploy@my-play-deploy-123456.iam.gserviceaccount.com
```

This creates a `service-account-key.json` file in your current directory. Store this securely -- it grants access to your Play Console account.

### Step 5: Invite the Service Account in Play Console

1. Go to [Google Play Console](https://play.google.com/console) > **Users and permissions**
2. Click **Invite new users**
3. Enter the service account email: `play-deploy@my-play-deploy-123456.iam.gserviceaccount.com`
4. Set the permissions listed in the [Permissions](#play-console-permissions) section below
5. Add specific app access or grant account-level access
6. Click **Invite user** and then **Send invite**

The service account is active immediately after invitation. No acceptance step is required.

### Required API Scope

All GPC auth methods use a single OAuth scope:

```
https://www.googleapis.com/auth/androidpublisher
```

This scope covers both the Publisher API (`androidpublisher.googleapis.com`) and the Reporting API (`playdeveloperreporting.googleapis.com`).

## Service Account

The recommended method for CI/CD pipelines and automated workflows.

### Login with a key file

```bash
gpc auth login --service-account /path/to/service-account-key.json
```

Expected output:

```
Authenticated as play-deploy@my-play-deploy-123456.iam.gserviceaccount.com
Profile "default" saved
```

The credentials are saved to your profile. Subsequent commands use the cached credentials automatically.

### Login with a named profile

```bash
gpc auth login --service-account /path/to/production-key.json --profile production
```

```bash
gpc auth login --service-account /path/to/staging-key.json --profile staging
```

Switch between profiles:

```bash
gpc auth switch production
```

### Token lifecycle

When using a service account, GPC:

1. Reads the private key from the JSON key file
2. Signs a JWT with the `androidpublisher` scope
3. Exchanges the JWT for an access token (valid for 1 hour)
4. Caches the access token in memory and on disk
5. Automatically refreshes the token when it expires (within 5 minutes of expiry)

**Performance optimizations:**

- **In-memory cache** -- subsequent requests skip filesystem I/O entirely
- **Mutex deduplication** -- concurrent requests share a single token refresh instead of racing to sign multiple JWTs
- **Smart 401 refresh** -- tokens are only re-fetched on authentication failures, not on rate limit or server errors

Tokens are never written to logs or command output. The `--verbose` flag shows token exchange timing but redacts the token value.

## OAuth 2.0

For interactive use on developer machines. Opens a browser for Google account authentication.

```bash
gpc auth login
```

Expected output:

```
Opening browser for authentication...
If the browser does not open, visit this URL:
https://accounts.google.com/o/oauth2/v2/auth?client_id=...&scope=...

Waiting for authorization...

Authenticated as developer@example.com
Profile "default" saved
```

OAuth tokens are cached in the profile. The refresh token is used to obtain new access tokens without re-authenticating.

### Token lifecycle

When using OAuth:

1. GPC opens a browser for Google account authorization
2. The user grants the `androidpublisher` scope
3. GPC receives an authorization code via local redirect
4. The code is exchanged for an access token (1 hour) and refresh token (long-lived)
5. Both tokens are cached in the profile
6. When the access token expires, GPC uses the refresh token to get a new one automatically

### Revoking OAuth tokens

```bash
gpc auth logout
```

This revokes the refresh token with Google and deletes the cached credentials from the profile.

## Environment Variable

Set the `GPC_SERVICE_ACCOUNT` environment variable to either a file path or a JSON string. This method is ideal for CI/CD where secrets are injected as environment variables.

### File path

```bash
export GPC_SERVICE_ACCOUNT=/path/to/service-account-key.json
gpc apps list
```

### JSON string

```bash
export GPC_SERVICE_ACCOUNT='{"type":"service_account","project_id":"my-project","private_key_id":"abc123","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"play-deploy@my-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}'
gpc apps list
```

### GitHub Actions example

```yaml
env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT_JSON }}

steps:
  - name: List apps
    run: gpc apps list
```

### GitLab CI example

```yaml
variables:
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT_JSON

deploy:
  script:
    - gpc apps list
```

When `GPC_SERVICE_ACCOUNT` is set, it takes precedence over profile-based credentials. No `gpc auth login` step is needed.

## Application Default Credentials

ADC uses the credentials from `gcloud auth application-default login` or from GCP metadata servers (when running on Google Cloud infrastructure).

### Local development

```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/androidpublisher
gpc apps list
```

### GCP workloads

On Compute Engine, Cloud Run, Cloud Functions, or GKE, ADC uses the instance's service account automatically. No configuration is needed if the instance's service account has the `androidpublisher` scope.

### Precedence

ADC is the lowest-priority auth method. GPC checks for credentials in this order:

1. `--service-account` CLI flag
2. `GPC_SERVICE_ACCOUNT` environment variable
3. Profile-based credentials (from `gpc auth login`)
4. Application Default Credentials

## Play Console Permissions

The service account (or user) must have appropriate permissions in Google Play Console. Permissions are set per-app or at the account level.

### Account-level permissions

| Permission                                                         | Required For                 | GPC Commands                                                                  |
| ------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------- |
| **View app information and download bulk reports**                 | Read access to all apps      | `apps list`, `apps info`, `reports download`                                  |
| **View financial data, orders, and cancellation survey responses** | Financial reports, purchases | `reports download financial`, `purchases get`, `orders refund`                |
| **Manage orders and subscriptions**                                | Purchase management          | `purchases acknowledge`, `purchases consume`, `purchases subscription cancel` |

### App-level permissions

| Permission                                                           | Required For                 | GPC Commands                                                             |
| -------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| **View app information**                                             | Read metadata and stats      | `apps info`, `vitals overview`, `reviews list`                           |
| **Create, edit, and delete draft apps**                              | App creation                 | (future: `apps create`)                                                  |
| **Release to production, exclude devices, and use Play App Signing** | Production releases          | `releases upload --track production`, `releases promote --to production` |
| **Release apps to testing tracks**                                   | Internal/alpha/beta releases | `releases upload --track internal`, `releases promote --to beta`         |
| **Manage testing tracks and edit tester lists**                      | Tester management            | `testers list`, `testers add`, `testers remove`                          |
| **Manage store presence**                                            | Listings and metadata        | `listings update`, `listings push`, `listings images upload`             |
| **Reply to reviews**                                                 | Review replies               | `reviews reply`                                                          |
| **Manage policy compliance submissions**                             | (future)                     | N/A                                                                      |

### Recommended CI/CD permissions

For a CI/CD service account that uploads and promotes releases, set these app-level permissions:

- View app information
- Release apps to testing tracks
- Release to production, exclude devices, and use Play App Signing
- Manage store presence (if updating listings)
- Manage testing tracks and edit tester lists (if managing testers)

## Profile Management

GPC supports multiple named profiles for switching between accounts or environments.

### List profiles

```bash
gpc auth profiles
```

Expected output:

```
Profiles:

  * default      play-deploy@my-project.iam.gserviceaccount.com  (active)
    staging      staging-deploy@my-project.iam.gserviceaccount.com
    production   prod-deploy@my-project.iam.gserviceaccount.com
```

### Switch active profile

```bash
gpc auth switch production
```

Expected output:

```
Switched to profile "production"
Active identity: prod-deploy@my-project.iam.gserviceaccount.com
```

### Use a profile for a single command

```bash
gpc apps list --profile staging
```

The `--profile` flag overrides the active profile for that command only.

### Show current identity

```bash
gpc auth whoami
```

Expected output:

```
play-deploy@my-project.iam.gserviceaccount.com (service-account, profile: default)
```

### Check auth status

```bash
gpc auth status
```

Expected output:

```
Profile:    default
Identity:   play-deploy@my-project.iam.gserviceaccount.com
Method:     service-account
Token:      valid (expires in 58 minutes)
Scopes:     https://www.googleapis.com/auth/androidpublisher
```

### Remove a profile

```bash
gpc auth logout --profile staging
```

This removes the cached credentials for the specified profile. If no `--profile` flag is given, the active profile is logged out.

## Troubleshooting

### "Permission denied" errors

The service account email must be invited in Play Console with the correct permissions. Check:

```bash
gpc auth whoami
```

Verify the email matches the one invited in Play Console > Users and permissions.

### "Token expired" errors

GPC refreshes tokens automatically. If you see token errors, check your system clock:

```bash
date -u
```

The system clock must be within 5 minutes of UTC. NTP sync issues are the most common cause of token errors in CI/CD.

### "API not enabled" errors

Ensure the Google Play Developer API is enabled in your Google Cloud project:

```bash
gcloud services list --enabled --project my-play-deploy-123456 | grep androidpublisher
```

Expected output:

```
androidpublisher.googleapis.com   Google Play Android Developer API
```

### Run the doctor command

```bash
gpc doctor
```

This verifies authentication, API connectivity, and configuration in one step.

## Next Steps

- [Configuration](/guide/configuration) -- Config files, environment variables, and profiles
- [Quick Start](/guide/quick-start) -- Run your first commands
- [CI/CD Integration](/ci-cd/) -- GitHub Actions, GitLab CI, and more
