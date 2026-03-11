# Installation

Four ways to install GPC — pick the one that fits your setup.

---

## Homebrew (macOS / Linux)

The fastest way to install on macOS or Linux. Installs the standalone binary — no Node.js required.

```bash
brew install yasserstudio/tap/gpc
```

Update:

```bash
brew upgrade gpc
```

Uninstall:

```bash
brew uninstall gpc
```

> **How it works:** The Homebrew tap (`yasserstudio/homebrew-tap`) hosts a formula that downloads the pre-built binary for your platform from GitHub Releases. Homebrew handles updates automatically when you run `brew update && brew upgrade`.

---

## npm (any platform)

Best for Node.js projects and when you want plugin support.

```bash
npm install -g @gpc-cli/cli
```

Or use without installing:

```bash
npx @gpc-cli/cli releases status
```

Update:

```bash
npm update -g @gpc-cli/cli
```

> **Note:** The npm install includes full plugin support (`@gpc-cli/plugin-sdk`, `@gpc-cli/plugin-ci`). The standalone binary disables plugin discovery since it can't resolve npm packages at runtime.

---

## Standalone Binary (curl)

One command, no dependencies. Downloads the platform-specific binary from GitHub Releases with SHA256 checksum verification.

```bash
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

Custom install directory:

```bash
GPC_INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

### Supported Platforms

| Platform | Architecture          | Asset                 |
| -------- | --------------------- | --------------------- |
| macOS    | Apple Silicon (arm64) | `gpc-darwin-arm64`    |
| macOS    | Intel (x64)           | `gpc-darwin-x64`      |
| Linux    | x64                   | `gpc-linux-x64`       |
| Windows  | x64                   | `gpc-windows-x64.exe` |

The install script auto-detects your OS and architecture. On Windows, download the `.exe` directly from the [GitHub Releases](https://github.com/yasserstudio/gpc/releases) page.

### Manual Download

```bash
# Download specific version
VERSION="v0.9.5"
curl -fsSL -o gpc "https://github.com/yasserstudio/gpc/releases/download/${VERSION}/gpc-darwin-arm64"
chmod +x gpc
sudo mv gpc /usr/local/bin/
```

### Checksum Verification

Every release includes a `checksums.txt` file. To verify manually:

```bash
# Download binary and checksums
curl -fsSL -o gpc "https://github.com/yasserstudio/gpc/releases/download/${VERSION}/gpc-darwin-arm64"
curl -fsSL -o checksums.txt "https://github.com/yasserstudio/gpc/releases/download/${VERSION}/checksums.txt"

# Verify
shasum -a 256 gpc
grep "gpc-darwin-arm64" checksums.txt
```

---

## From Source (GitHub)

For contributors or if you want the latest unreleased changes.

### Prerequisites

- Node.js 20+
- pnpm 9+

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

Run tests to verify:

```bash
pnpm test    # 597 tests across 7 packages
```

### Building the Standalone Binary Locally

Requires [Bun](https://bun.sh) for compilation:

```bash
# Current platform only
pnpm build:binary

# Specific target
npx tsx scripts/build-binary.ts --target linux-x64

# All platforms
npx tsx scripts/build-binary.ts --all

# Bundle only (no binary compilation)
npx tsx scripts/build-binary.ts --bundle-only
```

Binaries are output to `dist/bin/` with a `checksums.txt` file.

---

## Comparison

|                    | Homebrew          | npm                       | Standalone Binary                   | From Source                 |
| ------------------ | ----------------- | ------------------------- | ----------------------------------- | --------------------------- |
| **Platforms**      | macOS, Linux      | Any (Node.js)             | macOS, Linux, Windows               | Any                         |
| **Dependencies**   | None              | Node.js 20+               | None                                | Node.js 20+, pnpm 9+        |
| **Plugin support** | No                | Yes                       | No                                  | Yes                         |
| **Auto-update**    | `brew upgrade`    | `npm update -g`           | Re-run install script               | `git pull && pnpm build`    |
| **Best for**       | Local dev (macOS) | Node.js projects, plugins | CI/CD, Docker, minimal environments | Contributing, bleeding edge |

---

## CI/CD Installation

For CI pipelines, choose based on your environment:

```yaml
# Node.js available — use npm
- run: npm install -g @gpc-cli/cli

# No Node.js — use standalone binary
- run: curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh

# Docker — add to Dockerfile
RUN curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

See [CI/CD Recipes](./CI_CD.md) for complete pipeline examples.

---

## Verify Installation

```bash
gpc --version
gpc doctor        # Check auth, connectivity, and config
```

---

## Uninstall

```bash
# Homebrew
brew uninstall gpc

# npm
npm uninstall -g @gpc-cli/cli

# Standalone binary
sudo rm /usr/local/bin/gpc

# From source
cd gpc && pnpm link --global --deregister
```
