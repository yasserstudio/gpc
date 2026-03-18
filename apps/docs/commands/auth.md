---
outline: deep
---

<CommandHeader
  name="gpc auth"
  description="Manage authentication, credentials, and named profiles."
  usage="gpc auth <subcommand> [options]"
  :badges="['--profile', '--json']"
/>

## Commands

| Command                           | Description                                 |
| --------------------------------- | ------------------------------------------- |
| [`auth login`](#auth-login)       | Authenticate with Google Play Developer API |
| [`auth logout`](#auth-logout)     | Clear stored credentials and token cache    |
| [`auth status`](#auth-status)     | Show current authentication status          |
| [`auth whoami`](#auth-whoami)     | Show current authenticated identity         |
| [`auth profiles`](#auth-profiles) | List configured profiles                    |
| [`auth switch`](#auth-switch)     | Switch to a named profile                   |

## `auth login`

Authenticate with the Google Play Developer API using a service account key file or Application Default Credentials.

### Synopsis

```bash
gpc auth login [options]
```

### Options

| Flag                | Short | Type      | Default | Description                             |
| ------------------- | ----- | --------- | ------- | --------------------------------------- |
| `--service-account` |       | `string`  |         | Path to service account JSON key file   |
| `--adc`             |       | `boolean` | `false` | Use Application Default Credentials     |
| `--profile`         |       | `string`  |         | Store credentials under a named profile |

### Example

Authenticate with a service account:

```bash
gpc auth login --service-account ./service-account-key.json
```

```
Authenticated as play-api@my-project.iam.gserviceaccount.com
Project: my-project
```

Store under a named profile:

```bash
gpc auth login \
  --service-account ./production-key.json \
  --profile production
```

```
Profile "production" configured with play-api@my-project.iam.gserviceaccount.com
Project: my-project
```

Use Application Default Credentials:

```bash
gpc auth login --adc
```

CI environment (no interactive prompts):

```bash
export GPC_SERVICE_ACCOUNT="$(cat service-account-key.json)"
gpc auth status
```

---

## `auth logout`

Clear stored credentials and the local token cache.

### Synopsis

```bash
gpc auth logout
```

### Options

No command-specific options.

### Example

```bash
gpc auth logout
```

```
Credentials and token cache cleared.
```

---

## `auth status`

Show the current authentication status including the authenticated account and project.

### Synopsis

```bash
gpc auth status
```

### Options

No command-specific options.

### Example

When authenticated:

```bash
gpc auth status
```

```json
{
  "authenticated": true,
  "account": "play-api@my-project.iam.gserviceaccount.com",
  "project": "my-project",
  "profile": "production"
}
```

When not authenticated:

```bash
gpc auth status
```

```json
{
  "authenticated": false,
  "error": "No service account configured",
  "suggestion": "Run 'gpc auth login --service-account <path>' to authenticate"
}
```

Exits with code 3 if not authenticated.

---

## `auth whoami`

Print the email address of the currently authenticated service account.

### Synopsis

```bash
gpc auth whoami
```

### Options

No command-specific options.

### Example

```bash
gpc auth whoami
```

```
play-api@my-project.iam.gserviceaccount.com
```

If not authenticated, exits with code 3:

```
Not authenticated. Run: gpc auth login
```

---

## `auth profiles`

List all configured authentication profiles.

### Synopsis

```bash
gpc auth profiles
```

### Options

No command-specific options.

### Example

```bash
gpc auth profiles
```

```json
[
  { "name": "default", "active": false },
  { "name": "production", "active": true },
  { "name": "staging", "active": false }
]
```

When no profiles exist:

```
No profiles configured. Use: gpc auth login --service-account <path> --profile <name>
```

---

## `auth switch`

Switch the active authentication profile.

### Synopsis

```bash
gpc auth switch <profile>
```

### Options

No command-specific options.

### Example

```bash
gpc auth switch production
```

```
Switched to profile "production"
Service account: ./production-key.json
```

Switch to staging:

```bash
gpc auth switch staging
```

If the profile does not exist, exits with code 2.

## Related

- [config](./config) -- CLI configuration
- [Authentication Guide](/guide/authentication) -- Detailed authentication setup
