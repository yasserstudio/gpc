---
outline: deep
---

# Installation

GPC supports four installation methods. Choose based on your environment:

| Method | Best For | Plugin Support | Auto-Update |
|--------|----------|----------------|-------------|
| [Homebrew](#homebrew) | macOS / Linux desktops | No | `brew upgrade` |
| [npm](#npm) | Node.js projects, CI/CD | Yes | `npm update -g` |
| [Standalone binary](#standalone-binary) | CI/CD, no Node.js required | No | Re-download |
| [From source](#from-source) | Contributors, development | Yes | `git pull` |

## Homebrew

Recommended for macOS and Linux desktop users.

```bash
brew install yasserstudio/tap/gpc
```

Verify the installation:

```bash
gpc --version
```

Update to the latest version:

```bash
brew upgrade gpc
```

Uninstall:

```bash
brew uninstall gpc
```

## npm

Recommended for Node.js projects and CI/CD pipelines. This is the only method that supports plugins.

```bash
npm install -g @gpc-cli/cli
```

Or with other package managers:

```bash
pnpm add -g @gpc-cli/cli
```

```bash
yarn global add @gpc-cli/cli
```

Verify the installation:

```bash
gpc --version
```

Update to the latest version:

```bash
npm update -g @gpc-cli/cli
```

Uninstall:

```bash
npm uninstall -g @gpc-cli/cli
```

## Standalone Binary

Pre-compiled binaries with no runtime dependencies. Ideal for CI/CD environments without Node.js.

### Automatic install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

This script detects your platform, downloads the correct binary, and places it in `/usr/local/bin`.

### Manual download

Download the binary for your platform from the [GitHub releases page](https://github.com/yasserstudio/gpc/releases/latest).

### Platform support

| Platform | Architecture | Binary |
|----------|-------------|--------|
| macOS | arm64 (Apple Silicon) | `gpc-darwin-arm64` |
| macOS | x64 (Intel) | `gpc-darwin-x64` |
| Linux | x64 | `gpc-linux-x64` |
| Linux | arm64 | `gpc-linux-arm64` |
| Windows | x64 | `gpc-windows-x64.exe` |

### Manual install steps (Linux/macOS)

```bash
# Download the binary (replace PLATFORM with darwin-arm64, darwin-x64, or linux-x64)
curl -fsSL -o gpc "https://github.com/yasserstudio/gpc/releases/latest/download/gpc-PLATFORM"

# Make it executable
chmod +x gpc

# Move to a directory in your PATH
sudo mv gpc /usr/local/bin/gpc

# Verify
gpc --version
```

### Manual install steps (Windows)

```powershell
# Download the binary
Invoke-WebRequest -Uri "https://github.com/yasserstudio/gpc/releases/latest/download/gpc-windows-x64.exe" -OutFile "gpc.exe"

# Move to a directory in your PATH (e.g., C:\Windows\System32 or a custom directory)
Move-Item gpc.exe C:\Windows\System32\gpc.exe

# Verify
gpc --version
```

Uninstall:

```bash
sudo rm /usr/local/bin/gpc
```

## From Source

For contributors or if you need the latest unreleased changes.

### Prerequisites

- Node.js 20 or later
- pnpm 9.15 or later

### Steps

```bash
git clone https://github.com/yasserstudio/gpc.git
cd gpc
pnpm install
pnpm build
```

Link the CLI globally:

```bash
cd packages/cli
pnpm link --global
```

Verify the installation:

```bash
gpc --version
```

Run tests:

```bash
pnpm test
```

Update to the latest version:

```bash
git pull origin main
pnpm install
pnpm build
```

Uninstall:

```bash
pnpm unlink --global gpc
```

## CI/CD Installation

### GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g @gpc-cli/cli

- name: Authenticate
  run: gpc auth login --service-account "${{ secrets.GPC_SERVICE_ACCOUNT_JSON }}"
```

Or with the standalone binary (no Node.js required):

```yaml
- name: Install GPC
  run: curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

### GitLab CI

```yaml
before_script:
  - npm install -g @gpc-cli/cli
  - gpc auth login --service-account "$GPC_SERVICE_ACCOUNT_JSON"
```

### Docker

```dockerfile
FROM node:20-slim
RUN npm install -g @gpc-cli/cli
```

Or with the standalone binary:

```dockerfile
FROM alpine:latest
RUN curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

## Verify Installation

After installing with any method, run the doctor command to verify your setup:

```bash
gpc doctor
```

This checks:

- GPC binary is accessible and reports its version
- Node.js version is 20 or later (npm installs only)
- Network connectivity to `googleapis.com`
- Authentication credentials are configured and valid
- Config file is found and valid (if present)

## Shell Completions

Generate shell completions for tab-completion support:

```bash
# Bash — add to ~/.bashrc
eval "$(gpc completion bash)"

# Zsh — add to ~/.zshrc
eval "$(gpc completion zsh)"

# Fish — add to ~/.config/fish/config.fish
gpc completion fish | source
```

Or save to a file:

```bash
gpc completion bash > /usr/local/etc/bash_completion.d/gpc
gpc completion zsh > "${fpath[1]}/_gpc"
gpc completion fish > ~/.config/fish/completions/gpc.fish
```

## Next Steps

- [Quick Start](/guide/quick-start) -- Authenticate and run your first commands
- [Authentication](/guide/authentication) -- Set up service accounts, OAuth, or ADC
- [Configuration](/guide/configuration) -- Config files, environment variables, and profiles
