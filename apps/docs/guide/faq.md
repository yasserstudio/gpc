---
outline: deep
---

# Frequently Asked Questions

## What authentication method should I use?

Use a **service account** for CI/CD pipelines and automation. Use **OAuth** for local development and interactive use. Application Default Credentials (ADC) are supported for Google Cloud environments. See [Authentication](./authentication) for setup instructions.

## How is GPC different from Fastlane supply?

GPC is built natively on the Google Play Developer API v3 with TypeScript. It has no Ruby dependency, supports all modern API endpoints (~187 total), and provides first-class JSON output for CI/CD. See [Migrating from Fastlane](../migration/from-fastlane) for a detailed comparison.

## Can I use GPC in CI/CD?

Yes. All commands support `--json` for structured output and work in non-interactive mode. Set `GPC_NO_INTERACTIVE=1` for CI environments. See the [CI/CD guide](../ci-cd/) for GitHub Actions and GitLab CI examples.

## Does GPC support multiple apps?

Yes. Use the `--app` flag to specify a package name per command, or set up named profiles for different apps. See [Configuration](./configuration) for details on profiles.

## Is GPC free?

Yes. GPC is open source and released under the MIT license. The source code is available at [github.com/yasserstudio/gpc](https://github.com/yasserstudio/gpc).

## How do I install GPC?

Three options:

```bash
# npm (requires Node.js 20+)
npm install -g @gpc-cli/cli

# Homebrew (macOS/Linux)
brew install yasserstudio/tap/gpc

# Standalone binary (no dependencies)
# Download from GitHub Releases for your platform
```

See [Installation](./installation) for full details.

## What Node.js version is required?

Node.js 20 or later. If you use the standalone binary, no Node.js installation is needed.

## Can I extend GPC with plugins?

Yes. GPC has a plugin system with lifecycle hooks, custom command registration, and API request interception. See [Plugin Development](../advanced/plugins) for the SDK documentation.

## How do I report a bug?

Open an issue at [github.com/yasserstudio/gpc/issues](https://github.com/yasserstudio/gpc/issues). Include the output of `gpc doctor` and any error messages. Use `GPC_DEBUG=1` to capture detailed logs.

## What is the difference between `iap` and `otp` commands?

The `iap` commands use the legacy in-app purchases API. The `otp` (one-time products) commands use the modern monetization API with richer features like regional pricing and product tags. New projects should use `otp`.

## How do I use the standalone binary?

Download the binary for your platform from [GitHub Releases](https://github.com/yasserstudio/gpc/releases). Available for macOS (arm64, x64), Linux (arm64, x64), and Windows (x64). No Node.js installation required.

## Can AI assistants use GPC?

Yes. Install the GPC agent skills to teach AI coding assistants how to use every GPC workflow:

```bash
gpc install-skills
```

The interactive wizard lets you pick skills and target agents. See [Agent Skills](../advanced/skills) for the full list of 13 available skills.

## What Google Play APIs does GPC cover?

GPC covers approximately 187 endpoints across the Google Play Developer API v3, including apps, releases, tracks, listings, reviews, vitals, subscriptions, in-app products, users, testers, device tiers, data safety, and more. See [API Coverage](../reference/api-coverage) for the full breakdown.

## How do I update GPC?

```bash
# npm
npm update -g @gpc-cli/cli

# Homebrew
brew upgrade gpc

# Standalone binary
# Download the latest release from GitHub
```
