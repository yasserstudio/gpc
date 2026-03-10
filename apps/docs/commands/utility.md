---
outline: deep
---

# doctor / docs / completion

Utility commands for environment verification, documentation access, and shell completions.

## Commands

| Command                               | Description                   |
| ------------------------------------- | ----------------------------- |
| [`doctor`](#gpc-doctor)               | Verify setup and connectivity |
| [`docs`](#gpc-docs)                   | Open documentation in browser |
| [`completion bash`](#completion-bash) | Generate bash completions     |
| [`completion zsh`](#completion-zsh)   | Generate zsh completions      |
| [`completion fish`](#completion-fish) | Generate fish completions     |

## `gpc doctor`

Run diagnostic checks to verify your GPC setup: Node.js version, configuration, authentication, and API connectivity.

### Synopsis

```bash
gpc doctor
```

### Options

No command-specific options.

### Example

```bash
gpc doctor
```

All checks passing:

```
GPC Doctor

  ✓ Node.js 22.12.0
  ✓ Configuration loaded
  ✓ Default app: com.example.myapp
  ✓ Authenticated as play-api@my-project.iam.gserviceaccount.com
  ✓ API connectivity verified

All checks passed!
```

With failures:

```
GPC Doctor

  ✓ Node.js 22.12.0
  ✓ Configuration loaded
  - No default app configured (use --app flag or gpc config set app <package>)
  ✗ Authentication: No service account configured
    Run 'gpc auth login --service-account <path>' to authenticate

Some checks failed. Fix the issues above and run again.
```

Exits with code 0 if all checks pass, code 1 if any check fails.

---

## `gpc docs`

Open the GPC documentation in your default browser.

### Synopsis

```bash
gpc docs
```

### Options

No command-specific options.

### Example

```bash
gpc docs
```

Opens `https://github.com/yasserstudio/gpc#readme` in the default browser. If the browser cannot be opened, prints the URL to stdout.

---

## `completion bash`

Generate bash shell completions. Pipe the output to your bash completions directory or source it directly.

### Synopsis

```bash
gpc completion bash
```

### Options

No command-specific options.

### Example

Add to your `.bashrc`:

```bash
eval "$(gpc completion bash)"
```

Or save to completions directory:

```bash
gpc completion bash > /etc/bash_completion.d/gpc
```

Or for user-local completions:

```bash
mkdir -p ~/.local/share/bash-completion/completions
gpc completion bash > ~/.local/share/bash-completion/completions/gpc
```

---

## `completion zsh`

Generate zsh shell completions.

### Synopsis

```bash
gpc completion zsh
```

### Options

No command-specific options.

### Example

Add to your `.zshrc`:

```bash
eval "$(gpc completion zsh)"
```

Or save to your fpath:

```bash
gpc completion zsh > "${fpath[1]}/_gpc"
```

Or for Oh My Zsh users:

```bash
gpc completion zsh > ~/.oh-my-zsh/completions/_gpc
```

---

## `completion fish`

Generate fish shell completions.

### Synopsis

```bash
gpc completion fish
```

### Options

No command-specific options.

### Example

Save to fish completions directory:

```bash
gpc completion fish > ~/.config/fish/completions/gpc.fish
```

Or load for the current session:

```bash
gpc completion fish | source
```

## Related

- [auth](./auth) -- Fix authentication issues flagged by doctor
- [config](./config) -- Fix configuration issues flagged by doctor
- [Installation Guide](/guide/installation) -- Initial setup
