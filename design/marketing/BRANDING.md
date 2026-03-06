# Branding & Copywriting Guide

---

## Brand Identity

### Name: **GPC**

- **Full name:** GPC — Google Play Console CLI
- **Pronunciation:** "G-P-C" (three letters)
- **npm package:** `gpc` (short, memorable, easy to type)
- **Command:** `gpc` (matches package name)
- **Tagline candidates (ranked):**
  1. "The complete Google Play CLI."
  2. "Ship Android apps from your terminal."
  3. "Every Play Store operation. One command away."
  4. "Like `gh` for Google Play."

### Why "GPC"
- 3 letters — fast to type, easy to remember
- Maps directly to **G**oogle **P**lay **C**onsole
- Same pattern as established CLIs: `gh`, `aws`, `gcp`, `npm`
- Available on npm

---

## Brand Voice

### Personality
| Trait | In Practice |
|-------|-------------|
| **Technical** | Lead with code examples, not marketing speak |
| **Direct** | Say what it does, not what it "empowers you to do" |
| **Honest** | Acknowledge limitations. Never exaggerate coverage or performance. |
| **Confident** | We know this is better than the alternatives. State it with data. |
| **Witty (sparingly)** | A well-placed comment in docs, not jokes in error messages |

### Writing Rules
1. **Lead with the command.** Show `gpc releases upload app.aab --track beta` before explaining what it does.
2. **Specifics over superlatives.** "127 API endpoints" not "comprehensive coverage."
3. **Customer language.** "Ship your release" not "initiate your deployment workflow."
4. **Active voice.** "GPC uploads your AAB" not "Your AAB is uploaded by GPC."
5. **No filler.** Cut "simply," "just," "easily," "seamlessly," "robust."
6. **Comparisons are fair.** Acknowledge what competitors do well. Win on facts.

---

## Key Messages

### Primary Message
> **GPC is a command-line interface that covers the entire Google Play Developer API — releases, rollouts, metadata, reviews, vitals, subscriptions, and reports — in one tool.**

### Supporting Messages

**For solo developers:**
> Upload your AAB and release to beta in one command. No browser, no clicking, no waiting. `gpc releases upload app.aab --track beta`

**For teams and CI/CD:**
> Drop GPC into your GitHub Actions workflow. Upload, promote, and monitor — with JSON output and proper exit codes. Replace your Fastlane setup with 3 lines of YAML.

**For DevOps/SRE:**
> Monitor crash rates, ANRs, and startup times from your terminal. Set thresholds, gate rollouts on vitals, and pipe data to your monitoring stack.

**Against Fastlane:**
> GPC covers 127 API endpoints. Fastlane supply covers about 20. GPC starts in <500ms. Fastlane needs 2-3 seconds just to boot Ruby. GPC needs `npm`. Fastlane needs Ruby, Bundler, and 150+ gems.

---

## Homepage Copy

### Above the Fold

**Headline:**
> Ship Android apps from your terminal.

**Subheadline:**
> The complete CLI for Google Play. Upload releases, manage rollouts, sync metadata, monitor vitals — all from one tool.

**CTA:**
> `npm install -g gpc` → [Get Started] [View on GitHub]

### Problem Section

**Header:** You shouldn't need a browser to ship your app.

**Copy:**
> Every Android release follows the same ritual: open the Play Console, upload your AAB, fill in release notes, pick a track, set the rollout percentage, click through three confirmation screens, and hope you didn't pick the wrong track.
>
> Or you set up Fastlane — install Ruby, Bundler, 150+ gems — and get access to maybe 20% of the API.
>
> GPC covers the entire Google Play Developer API in one CLI. No Ruby. No browser. No ceremony.

### Solution Section

**Header:** One CLI. 127 API endpoints.

```
$ gpc releases upload app.aab --track beta
Uploading app-release.aab (42.3 MB)... done
Version code: 142
Track: beta
Status: completed

$ gpc vitals crashes --version 142
Crash rate: 0.8% (good)
Top cluster: NullPointerException in PaymentFragment
Sessions: 12,847

$ gpc reviews list --stars 1-2 --since 7d
3 new low-rated reviews
```

### How It Works Section

**Step 1:** Authenticate
> `gpc auth login --service-account key.json`
> Or use OAuth, environment variables, or Application Default Credentials.

**Step 2:** Configure
> `gpc config init`
> Set your default app, track, and output preferences. Or skip it and use flags.

**Step 3:** Ship
> `gpc releases upload app.aab --track production --rollout 10`
> Upload, promote, rollout, halt, resume, complete — all from your terminal.

### Social Proof Section
> (Populated post-launch with testimonials, GitHub stars, npm downloads)

### Comparison Section

| | GPC | Fastlane supply | Console UI |
|---|---|---|---|
| API endpoints covered | 127 | ~20 | All (manual) |
| Cold start time | <500ms | 2-3s | 5-10s (page load) |
| CI/CD native | JSON + exit codes | Partial | No |
| Runtime dependency | Node.js | Ruby + Bundler | Browser |
| Reviews & Vitals | Yes | No | Yes (manual) |
| Subscriptions & IAP | Yes | No | Yes (manual) |

### Final CTA

**Header:** Stop clicking. Start shipping.

> `npm install -g gpc`
>
> [Read the Docs] [View on GitHub] [Star on GitHub]

---

## README Copy (GitHub)

```markdown
# gpc

The complete Google Play CLI. Upload releases, manage rollouts, sync metadata,
monitor vitals, and more — from your terminal or CI/CD pipeline.

## Quick Start

npm install -g gpc

# Authenticate
gpc auth login --service-account path/to/key.json

# Upload and release
gpc releases upload app.aab --track internal

# Check vitals
gpc vitals overview

# Monitor reviews
gpc reviews list --stars 1-3 --since 7d

## Why GPC?

- **127 API endpoints** — every Google Play Developer API v3 endpoint
- **No Ruby** — pure TypeScript, runs on Node.js 20+
- **CI/CD native** — JSON output, exit codes, env var config
- **Fast** — <500ms cold start
- **Complete** — releases, rollouts, metadata, reviews, vitals,
  subscriptions, IAP, reports, user management

## GPC vs Alternatives

| | GPC | Fastlane supply | gradle-play-publisher |
|---|---|---|---|
| Standalone CLI | Yes | Yes | No (Gradle only) |
| API coverage | Full (~127) | Partial (~20) | Partial (~15) |
| Runtime | Node.js | Ruby | JVM |
| Reviews & Vitals | Yes | No | No |
| Subscriptions | Yes | No | No |

## Documentation

Full docs at [gpc.dev](https://gpc.dev) (placeholder)
```

---

## Elevator Pitches

### 10-second pitch
> "GPC is a CLI for the Google Play Store. It covers the entire API — releases, vitals, reviews, subscriptions — everything. One `npm install`, no Ruby."

### 30-second pitch
> "If you manage Android apps, you're either clicking through the Play Console or fighting with Fastlane's Ruby dependencies — and neither covers more than a fraction of the API. GPC is a TypeScript CLI that maps the entire Google Play Developer API — 127 endpoints — to simple commands. Upload, release, rollout, monitor vitals, respond to reviews, manage subscriptions — all from your terminal or CI/CD pipeline."

### Tweet-length
> "GPC: the Google Play CLI that Fastlane should have been. 127 API endpoints, TypeScript, <500ms startup, no Ruby. `npm install -g gpc`"

---

## Visual Identity (Guidelines)

### Logo Direction
- Monochrome terminal-inspired aesthetic
- Incorporate the `>_` prompt symbol or a minimal Play Store triangle
- Must be legible at 16x16 (favicon) and 512x512 (social)
- Works on dark and light backgrounds

### Color Palette
| Use | Color | Hex |
|-----|-------|-----|
| Primary | Terminal Green | `#00D26A` |
| Secondary | Dark Background | `#1A1B26` |
| Accent | Play Store Blue-Green | `#00BFA5` |
| Text | Light Gray | `#E0E0E0` |
| Error | Red | `#FF5252` |
| Warning | Amber | `#FFB300` |

### Typography
- **Headings:** JetBrains Mono or Fira Code (monospace, signals developer tool)
- **Body:** Inter or system font stack
- **Code blocks:** Same monospace as headings

### Imagery Style
- Terminal screenshots and recordings (asciinema/VHS)
- Dark terminal backgrounds with colored output
- Minimal diagrams (Mermaid or ASCII art)
- No stock photos, no abstract gradients, no generic "developer at laptop"
