---
outline: deep
---

<CommandHeader
  name="gpc apps"
  description="List and inspect apps in your Google Play developer account."
  usage="gpc apps <subcommand> [options]"
  :badges="['--json']"
/>

## Commands

| Command                       | Description                  |
| ----------------------------- | ---------------------------- |
| [`apps list`](#apps-list)     | List configured applications |
| [`apps info`](#apps-info)     | Show app details             |
| [`apps update`](#apps-update) | Update app details           |

## `apps list`

List applications configured in the current GPC config.

### Synopsis

```bash
gpc apps list
```

### Options

No command-specific options.

### Example

```bash
gpc apps list
```

```json
[{ "packageName": "com.example.myapp", "source": "config" }]
```

When no app is configured:

```
No apps configured.

Set a default app:
  gpc config set app com.example.myapp

Or use the --app flag:
  gpc apps info --app com.example.myapp
```

---

## `apps info`

Show detailed information about an app from the Google Play Developer API.

### Synopsis

```bash
gpc apps info [package]
```

### Options

No command-specific options. The package name is taken from the positional argument, `--app` flag, or config.

### Example

With positional argument:

```bash
gpc apps info com.example.myapp
```

With global flag:

```bash
gpc apps info --app com.example.myapp
```

Using the configured default app:

```bash
gpc config set app com.example.myapp
gpc apps info
```

```json
{
  "packageName": "com.example.myapp",
  "title": "My App",
  "defaultLanguage": "en-US",
  "contactEmail": "support@example.com",
  "contactPhone": "+1-555-0100",
  "contactWebsite": "https://example.com"
}
```

Output as YAML:

```bash
gpc apps info com.example.myapp --output yaml
```

```yaml
packageName: com.example.myapp
title: My App
defaultLanguage: en-US
contactEmail: support@example.com
```

---

## `apps update`

Update app-level details such as contact information and default language.

### Synopsis

```bash
gpc apps update [options]
```

### Options

| Flag             | Short | Type     | Default | Description               |
| ---------------- | ----- | -------- | ------- | ------------------------- |
| `--email`        |       | `string` |         | Contact email address     |
| `--phone`        |       | `string` |         | Contact phone number      |
| `--website`      |       | `string` |         | Contact website URL       |
| `--default-lang` |       | `string` |         | Default language (BCP 47) |

At least one field must be provided.

### Example

Update contact email:

```bash
gpc apps update --app com.example.myapp --email support@example.com
```

Update multiple fields:

```bash
gpc apps update \
  --app com.example.myapp \
  --email support@example.com \
  --phone "+1-555-0100" \
  --website "https://example.com" \
  --default-lang en-US
```

## Related

- [config](./config) -- Set default app
- [listings](./listings) -- Store listing management
