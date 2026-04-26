---
outline: deep
---

<CommandHeader
  name="gpc setup"
  description="Guided first-time setup. Walks through authentication, configuration, shell completion, and verification in one command."
  usage="gpc setup [options]"
  :badges="['--auto', 'interactive']"
/>

## Synopsis

```sh
gpc setup [options]
```

## Options

| Flag     | Description                                                   |
| -------- | ------------------------------------------------------------- |
| `--auto` | Non-interactive setup from env vars and auto-detected credentials (CI-friendly) |

## What It Does

`gpc setup` orchestrates the entire first-run experience in five steps:

1. **Authenticate** - Service account or ADC, with credential validation
2. **Default app** - Set the default package name
3. **Save config** - Write `~/.config/gpc/config.json` (or update existing)
4. **Shell completion** - Print install instructions for your shell
5. **Verify** - Run `gpc doctor` to confirm everything works

## Interactive Mode

When run in a TTY without `--auto`, `gpc setup` prompts for each step:

```sh
gpc setup
```

If credentials or a config file already exist, they are detected and reused (with a prompt to confirm).

## Auto Mode (CI)

For CI pipelines, `--auto` configures GPC entirely from environment variables:

```sh
export GPC_SERVICE_ACCOUNT=/path/to/sa.json
export GPC_APP=com.example.app

gpc setup --auto
```

Auto mode tries `resolveAuth()` (which checks `GPC_SERVICE_ACCOUNT`, `GOOGLE_APPLICATION_CREDENTIALS`, then ADC) and reads `GPC_APP`. It never prompts for input.

## Differences from Other Commands

| Command          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `gpc setup`      | Full guided setup (auth + config + verify)   |
| `gpc auth login` | Auth-only wizard                             |
| `gpc config init`| Config-only wizard                           |
| `gpc quickstart` | Read-only verification (checks existing state) |
| `gpc doctor`     | Detailed diagnostics and auto-fix            |

## Examples

First-time interactive setup:

```sh
gpc setup
```

CI setup from env vars:

```sh
GPC_SERVICE_ACCOUNT=sa.json GPC_APP=com.example.app gpc setup --auto
```

## See Also

- [Authentication Guide](/guide/authentication)
- [`gpc doctor`](/commands/utility)
- [`gpc config`](/commands/config)
