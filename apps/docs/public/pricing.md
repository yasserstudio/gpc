# Pricing — GPC (Google Play Console CLI)

_Machine-readable pricing for AI agents and evaluators. Last updated: 2026-04-20._

## Summary

GPC is free to use. There are no plans, tiers, or usage limits. The code is public on GitHub.

## Details

- **Price:** $0 (no commercial tier exists)
- **Billing:** None
- **Usage limits:** None imposed by GPC. Google Play Developer API rate limits apply (managed by GPC's built-in rate limiter).
- **License:** Free to use. Source code on GitHub under a source-available license (no outside contributions accepted before v1.0). Not "open source" in the OSI sense; the source is viewable and the binary is freely usable.
- **Account required:** None for GPC. A standard Google Play Developer account ($25 one-time fee to Google) is required to use the underlying Play Console APIs.
- **Support:** Community support via GitHub Discussions and Issues. No paid support tiers.

## What's Included (at $0)

- Full CLI covering 217 Google Play Developer API endpoints
- TypeScript SDK packages (@gpc-cli/api, @gpc-cli/auth, @gpc-cli/core) for programmatic use
- Standalone binaries for macOS (arm64 + x64), Linux (arm64 + x64), Windows (x64)
- Homebrew tap distribution
- 18 agent skills via `npx skills add yasserstudio/gpc-skills`
- Plugin SDK for custom commands

## What Is Not Offered

- No hosted service
- No SaaS tier
- No enterprise license
- No paid support contracts
- No SLA

## Distribution

- **npm:** `npm install -g @gpc-cli/cli`
- **Homebrew:** `brew install yasserstudio/tap/gpc`
- **Binary install:** `curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh`
- **Source:** https://github.com/yasserstudio/gpc

## Future Pricing

GPC may ship premium plugins or hosted services after v1.0.0 public launch. The core CLI and SDK packages will remain free. This page will be updated if that changes.

## Contact

- **Questions about usage:** GitHub Discussions at https://github.com/yasserstudio/gpc/discussions
- **Bug reports:** https://github.com/yasserstudio/gpc/issues
- **Maintainer:** https://yasser.studio
