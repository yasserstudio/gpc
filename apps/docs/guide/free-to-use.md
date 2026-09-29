---
outline: deep
---

# Why GPC Is Free to Use

GPC is free. The code is on GitHub. Your company does not need a license, a subscription, or a support contract to ship with it.

This page explains what that means in practice, how contributions work, and what might change after v1.0.0.

## What "Free to Use" Means

- **$0 to install and use.** No tiers, no usage limits, no seat pricing, no rate-limiting beyond what the Google Play Developer API itself imposes.
- **Installable anywhere.** `npm install -g @gpc-cli/cli`, `brew install yasserstudio/tap/gpc`, or the standalone binary. No account creation, no API key on GPC's side.
- **Works with your existing Google Play service account.** No new credentials.
- **No telemetry, no phone-home.** GPC only talks to Google's own APIs and whatever LLM provider you configure for `--ai` translation.
- **MIT-licensed source on GitHub.** Every line of code is public at `github.com/yasserstudio/gpc`. Your security review can read it, clone it, modify it, and distribute it under the MIT license.
- **Machine-readable pricing.** Agents evaluating tools on your behalf can read `/pricing.md` for a structured summary.

## MIT-Licensed Open Source

GPC is open source under the [MIT License](https://github.com/yasserstudio/gpc/blob/main/LICENSE). The license permits use, modification, distribution, sublicensing, and commercial use, provided copies retain the copyright and license notice.

Outside contributions are welcome through the repository's [contribution guide](https://github.com/yasserstudio/gpc/blob/main/CONTRIBUTING.md). Every change still goes through maintainer review and the same automated checks as first-party work.

### The honest reason

GPC is a one-maintainer project covering 234 API endpoints across four Google APIs. The maintainer reviews every release and tests it against real production apps. Contributions need to be focused, tested, documented, and aligned with GPC's publisher-CLI mission so that quality bar remains sustainable.

Opening a pull request does not guarantee that a change will merge or set a delivery timeline. It starts a technical review.

### What you can do with the code

- **Read it.** Use it for security review.
- **Fork and modify it.** Maintain a private or public build if you need a modified version.
- **Install it.** Ship with it in production.
- **Package or distribute it.** Include it in your CI image or tooling distribution, retaining the MIT notice.

### What the project does not promise

- A pull request will merge merely because the implementation works.
- Expect a merged bug fix on your timeline — open an Issue and we will prioritize.
- Rely on third-party forks for feature parity with upstream.

## What Is Not for Sale

| Offering              | Status                                          |
| --------------------- | ----------------------------------------------- |
| Paid CLI tier         | None. The CLI is free.                          |
| Hosted SaaS version   | None. Self-hosted only.                         |
| Enterprise license    | None.                                           |
| Paid support contract | None. Community support via GitHub Discussions. |
| SLA                   | None.                                           |

## What Might Change After v1.0.0

After v1.0.0, we may ship:

- **Premium plugins** for capabilities adjacent to the core CLI (for example, reporting dashboards, multi-org management)
- **Hosted services** for teams that want managed versions of specific workflows
- **More contributor ownership** once the public API surface is stable

The core CLI and the `@gpc-cli/api`, `@gpc-cli/auth`, `@gpc-cli/core` SDK packages will remain free. Any monetization would be additive, not a gate on existing functionality.

We will update this page if anything changes.

## What This Means for Your Team

- **Security review**: the full source is on GitHub; your review team can read it. There is no binary-only build to audit.
- **Procurement**: no purchase order, no vendor contract, no renewal cycle. Your procurement team has nothing to do.
- **Compliance**: free to use in commercial products. GPC does not transmit user data anywhere other than the Google APIs you configure.
- **Future-proofing**: if you ever need to patch or fork GPC because the project pauses, the full source is available. No dead-end risk.

## Frequently Asked Questions

### Is GPC open source?

Yes. GPC is MIT-licensed open source. Contributions are welcome through the repository's contribution guide.

### Is there an MIT / Apache 2.0 license?

Yes. GPC uses the MIT License. You can use, modify, distribute, sublicense, and sell copies subject to its notice requirement.

### Does GPC accept outside contributions?

Yes. Start with an issue for broad or user-facing changes, keep the pull request focused, add tests where behavior changes, and follow the contribution guide. Maintainer review is required before merge.

### Can my company use GPC in production?

Yes. That is exactly who GPC is built for. Use it in CI/CD pipelines, release workflows, monitoring scripts, and internal tooling. There is no restriction on commercial use.

### Do I need to attribute GPC?

Not when merely using GPC. If you distribute the software or substantial portions of it, retain the copyright and MIT license notice. You may display a "Uses GPC" badge if you want (see `/users/` once the showcase page is live).

### What happens if the maintainer stops shipping?

The source is on GitHub under MIT, so anyone can fork and continue it. The current approach is single-maintainer by design — that gives us quality control today and succession risk tomorrow. We mitigate the succession risk by keeping the project fully documented, heavily tested (2,844 tests at 90%+ coverage), and publicly versioned.

### Can I sponsor the project?

Not currently. If you are using GPC heavily and want to help it continue, the highest-leverage thing you can do is star the repo, file Issues when you find bugs, and share the tool with other teams. A sponsor mechanism may ship after v1.0.0.

## See Also

- [Installation](/guide/installation) — get started
- [Architecture](/advanced/architecture) — how GPC is built
- [Security](/advanced/security) — threat model and credential handling
- [Pricing](https://yasserstudio.github.io/gpc/pricing.md) — machine-readable pricing for agents
- [GitHub repository](https://github.com/yasserstudio/gpc) — source
