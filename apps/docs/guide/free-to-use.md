---
outline: deep
---

# Why GPC Is Free to Use

GPC is free. The code is on GitHub. Your company does not need a license, a subscription, or a support contract to ship with it.

This page explains what that means in practice, why GPC is not open source in the OSI sense, and what might change after v1.0.0.

## What "Free to Use" Means

- **$0 to install and use.** No tiers, no usage limits, no seat pricing, no rate-limiting beyond what the Google Play Developer API itself imposes.
- **Installable anywhere.** `npm install -g @gpc-cli/cli`, `brew install yasserstudio/tap/gpc`, or the standalone binary. No account creation, no API key on GPC's side.
- **Works with your existing Google Play service account.** No new credentials.
- **No telemetry, no phone-home.** GPC only talks to Google's own APIs and whatever LLM provider you configure for `--ai` translation.
- **Viewable source on GitHub.** Every line of code is public at `github.com/yasserstudio/gpc`. Your security review can read it, clone it, fork it if you need to ship a patched build.
- **Machine-readable pricing.** Agents evaluating tools on your behalf can read `/pricing.md` for a structured summary.

## Why Not "Open Source"

GPC is **source-available**, not open source in the OSI sense. We do not currently accept outside contributions.

That distinction matters to two audiences: security reviewers at larger companies, and developers who expect "open source" to mean community-driven.

### The honest reason

GPC is a one-maintainer project covering 217 API endpoints across three Google APIs. Accepting random pull requests at this stage would multiply the surface area we can vouch for without adding headcount to vouch for it. Every commit in GPC has been written, reviewed, and tested by one person against real production apps. That is the quality bar the project ships at today.

We intend to reopen contributions after v1.0.0, once the API surface is locked and the contribution guide is written. Until then, the honest framing is: free to use, code is public for inspection, contributions deferred.

This is the same model Tailwind CSS ran for years before going fully open source, and the same model several well-regarded tools use today. It is not experimental or hostile to the developer community.

### What you can do with the code

- **Read it.** Use it for security review.
- **Fork it.** Publish a private build internally if you need a modified version urgently.
- **Install it.** Ship with it in production.
- **Package it.** Include it in your CI Docker image or internal tooling distribution.

### What you cannot do (yet)

- Submit a pull request and expect it to be merged (we will decline politely).
- Expect a merged bug fix on your timeline — open an Issue and we will prioritize.
- Rely on third-party forks for feature parity with upstream.

## What Is Not for Sale

| Offering | Status |
|---|---|
| Paid CLI tier | None. The CLI is free. |
| Hosted SaaS version | None. Self-hosted only. |
| Enterprise license | None. |
| Paid support contract | None. Community support via GitHub Discussions. |
| SLA | None. |

## What Might Change After v1.0.0

After v1.0.0, we may ship:

- **Premium plugins** for capabilities adjacent to the core CLI (for example, reporting dashboards, multi-org management)
- **Hosted services** for teams that want managed versions of specific workflows
- **Open contributions** with a documented contribution guide

The core CLI and the `@gpc-cli/api`, `@gpc-cli/auth`, `@gpc-cli/core` SDK packages will remain free. Any monetization would be additive, not a gate on existing functionality.

We will update this page if anything changes.

## What This Means for Your Team

- **Security review**: the full source is on GitHub; your review team can read it. There is no binary-only build to audit.
- **Procurement**: no purchase order, no vendor contract, no renewal cycle. Your procurement team has nothing to do.
- **Compliance**: free to use in commercial products. GPC does not transmit user data anywhere other than the Google APIs you configure.
- **Future-proofing**: if you ever need to patch or fork GPC because the project pauses, the full source is available. No dead-end risk.

## Frequently Asked Questions

### Is GPC open source?

Not in the OSI sense. The code is public on GitHub, free to read, inspect, and use. We do not accept outside contributions before v1.0.0.

### Is there an MIT / Apache 2.0 license?

No. The license is source-available. You can inspect, fork for internal use, and install. You cannot relicense or redistribute without permission.

### Will GPC become fully open source?

We intend to reopen contributions after v1.0.0 ships. Whether GPC adopts a standard OSI license at that point depends on how the project grows; we will update this page with the decision.

### Can my company use GPC in production?

Yes. That is exactly who GPC is built for. Use it in CI/CD pipelines, release workflows, monitoring scripts, and internal tooling. There is no restriction on commercial use.

### Do I need to attribute GPC?

Not required. You may display a "Uses GPC" badge if you want (see `/users/` once the showcase page is live). We welcome mentions but do not mandate them.

### What happens if the maintainer stops shipping?

The source is on GitHub. Forks are permitted for internal use. The current approach is single-maintainer by design — that gives us quality control today and succession risk tomorrow. We mitigate the succession risk by keeping the project fully documented, heavily tested (2,037 tests at 90%+ coverage), and publicly versioned.

### Can I sponsor the project?

Not currently. If you are using GPC heavily and want to help it continue, the highest-leverage thing you can do is star the repo, file Issues when you find bugs, and share the tool with other teams. A sponsor mechanism may ship after v1.0.0.

## See Also

- [Installation](/guide/installation) — get started
- [Architecture](/advanced/architecture) — how GPC is built
- [Security](/advanced/security) — threat model and credential handling
- [Pricing](https://yasserstudio.github.io/gpc/pricing.md) — machine-readable pricing for agents
- [GitHub repository](https://github.com/yasserstudio/gpc) — source
