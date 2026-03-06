# Product Marketing Context

> Foundation document referenced by all marketing activities.

---

## 1. Product Overview

- **One-liner:** The complete command-line interface for managing Android apps on Google Play — from upload to analytics.
- **What it does:** GPC lets developers and teams manage every aspect of their Google Play presence from the terminal: releases, rollouts, metadata, reviews, vitals, subscriptions, pricing, and reports.
- **Category:** Developer Tools / CLI
- **Type:** Open-source CLI tool (npm package)
- **Business Model:** Open-core. Free CLI (MIT licensed) + potential future premium plugins/hosted services.

---

## 2. Target Audience

| Attribute | Detail |
|-----------|--------|
| **Company type** | Mobile-first startups, Android app studios, mid-to-large companies with Android apps, CI/CD-heavy teams |
| **Company size** | Solo developers to 500+ person engineering orgs |
| **Decision-makers** | Engineering leads, DevOps/platform engineers, mobile team leads, release managers |
| **Primary use case** | Automate Play Store operations (releases, rollouts, metadata) from terminal or CI/CD |
| **Jobs to be done** | "When I push a release, I want it deployed to the right track with the right rollout percentage, without opening a browser." |

---

## 3. Personas

### Persona 1: Solo Android Developer
- **Role:** Builds and publishes their own apps
- **Cares about:** Speed, simplicity, avoiding the Play Console UI
- **Challenge:** Manually uploading AABs, copying release notes, managing screenshots through a slow web UI
- **Value promised:** "Ship releases in one command instead of 15 minutes of clicking"

### Persona 2: Mobile Release Engineer / Platform Engineer
- **Role:** Manages releases for multiple apps across teams
- **Cares about:** Automation, consistency, CI/CD integration, auditability
- **Challenge:** Fastlane is heavy and Ruby-dependent; raw API calls require boilerplate; no unified tool covers the full API
- **Value promised:** "One CLI that replaces your release scripts, Fastlane supply, and manual Console checks"

### Persona 3: DevOps / SRE
- **Role:** Monitors app health, automates incident response
- **Cares about:** Vitals, crash rates, alerting thresholds, scriptability
- **Challenge:** No CLI access to vitals or crash data; must check Console UI or build custom integrations
- **Value promised:** "Monitor crash rates, ANRs, and startup times from your terminal or monitoring pipeline"

### Persona 4: Engineering Lead / CTO
- **Role:** Makes tooling decisions for the team
- **Cares about:** Reducing manual work, standardizing release process, reducing errors
- **Challenge:** Current release process is error-prone, hard to audit, and depends on individuals knowing the Play Console UI
- **Value promised:** "Standardize your entire Play Store workflow with a scriptable, auditable CLI"

---

## 4. Problems & Pain Points

### Core Challenge
Managing Android apps on Google Play requires either manual Console UI interaction or stitching together fragmented tools (Fastlane, Gradle plugins, raw API scripts) — none of which cover the full API surface.

### Why Alternatives Fall Short
| Alternative | Shortcoming |
|-------------|-------------|
| **Play Console UI** | Slow, manual, not automatable, no audit trail |
| **Fastlane supply** | Ruby dependency, heavy ecosystem, partial API coverage, slow startup |
| **gradle-play-publisher** | Gradle-only, no ops/monitoring, not standalone |
| **Raw API calls** | Complex auth, edit lifecycle management, no pagination, no rate limiting |
| **Custom scripts** | Maintenance burden, fragile, duplicated across teams |

### Cost of the Problem
- **Time:** 15-30 min per manual release × multiple apps × multiple tracks = hours/week
- **Money:** Engineering time wasted on release ops instead of building features
- **Opportunity:** Delayed releases, slower rollout response, missed vitals degradation
- **Risk:** Manual errors (wrong track, wrong rollout %), inconsistent release processes

### Emotional Tension
"I shouldn't need to open a browser to ship my app. This is 2026."

---

## 5. Competitive Landscape

### Direct Competitors
| Competitor | Key Shortcoming for GPC |
|------------|------------------------|
| **Fastlane supply** | Ruby ecosystem lock-in, partial API coverage, heavy deps |
| **gradle-play-publisher** | Not a CLI, Gradle-only, no ops/monitoring capabilities |
| **play-console-cli** | Unmaintained, minimal coverage, no enterprise features |

### Secondary Competitors
| Competitor | Relationship |
|------------|-------------|
| **Google Play Console UI** | The "manual" alternative everyone has |
| **Custom internal scripts** | The "we built our own" approach |

### Indirect Competitors
| Competitor | Category |
|------------|----------|
| **Firebase CLI** | Adjacent (testing/crashlytics, not Play Store distribution) |
| **Bitrise / Codemagic** | Mobile CI/CD platforms with some Play Store steps built in |

---

## 6. Differentiation

### Key Differentiators
1. **Full API coverage** — ~127 endpoints mapped, not just uploads and tracks
2. **Standalone CLI** — no build system, no ecosystem, just `npx gpc`
3. **CI/CD-native** — JSON output, exit codes, env var config, non-interactive mode
4. **Enterprise features** — multi-profile auth, plugin system, audit logging
5. **Modern TypeScript** — fast startup, type-safe, ESM-first, actively maintained

### How We Solve Differently
GPC wraps the **entire** Google Play Developer API v3 in a single, well-designed CLI with consistent UX across all 127+ endpoints. One tool replaces Fastlane supply + Console UI + custom scripts + monitoring dashboards.

### Why That's Better
- **For solo devs:** One `npm install -g gpc` replaces Ruby + Fastlane + Bundler
- **For teams:** Standardized release process, auditable, scriptable
- **For CI/CD:** Drop-in replacement with structured output, not Fastlane's Ruby overhead
- **For ops:** First CLI that exposes vitals, reviews, and reports — no alternatives exist

---

## 7. Objections & Responses

| Objection | Response |
|-----------|----------|
| "We already use Fastlane" | GPC covers 80+ endpoints Fastlane doesn't (reviews, vitals, subscriptions, reports). Use both during migration, or switch fully. No Ruby needed. |
| "Why not just use the Console UI?" | You're paying 15-30 minutes of engineering time per release. GPC automates the entire workflow and integrates with your existing CI. |
| "Is it maintained? Open-source CLIs die." | Active development, comprehensive test suite, backed by a clear roadmap. Enterprise-grade architecture designed for longevity. |

### Anti-Personas (Not a Good Fit)
- Teams that only release once a quarter and are fine with the Console UI
- iOS-only teams (see App Store Connect CLI for the Apple equivalent)
- Non-technical product managers who need a GUI

---

## 8. Switching Dynamics (JTBD Four Forces)

| Force | Detail |
|-------|--------|
| **Push (away from current)** | Fastlane is slow, Ruby is a pain, Console UI is tedious, custom scripts break |
| **Pull (toward GPC)** | Full API coverage, one tool, fast, TypeScript, CI/CD-native, JSON output |
| **Habit (stay with current)** | "Our Fastlane setup works well enough," existing scripts, team familiarity |
| **Anxiety (about switching)** | "Will it break our release process?" "Is it mature enough?" "Who maintains it?" |

### Reducing Anxiety
- Migration guide from Fastlane with command mapping
- `gpc doctor` validates setup before first use
- Fastlane metadata format compatibility (drop-in for listings)
- Comprehensive docs with real CI/CD recipes

---

## 9. Customer Language

### How They Describe the Problem
- "I spend half my Friday afternoon in the Play Console uploading builds"
- "Our release process is a wiki page with 23 steps and screenshots"
- "Fastlane works but it's a nightmare when the Ruby version doesn't match"
- "We have a bash script that nobody understands but everyone is afraid to touch"
- "I just want to `git push` and have it deployed to internal track"

### How They Describe the Solution
- "Like `gh` (GitHub CLI) but for the Play Store"
- "Like `aws-cli` but for Google Play"
- "One command to upload and release"
- "Scriptable Play Store"

### Words to Use
- Ship, release, deploy, automate, track, rollout, monitor
- Fast, simple, scriptable, CI/CD, JSON, terminal, command-line
- Replace, migrate, drop-in

### Words to Avoid
- Synergy, leverage, utilize, cutting-edge, disrupt, revolutionary
- "All-in-one platform" (we're a focused CLI, not a platform)
- "AI-powered" (we don't use AI and don't need to claim it)

---

## 10. Brand Voice

| Attribute | Description |
|-----------|-------------|
| **Tone** | Technical but approachable. Like a senior engineer explaining something to a peer. |
| **Style** | Direct, concise, code-first. Show don't tell. Lead with the command, explain after. |
| **Personality** | Confident, opinionated (about good DX), no-nonsense, slightly witty |
| **Adjectives** | Reliable, fast, complete, honest, developer-friendly |

### Voice Examples
- **Do:** "Upload your AAB and release to beta in one command: `gpc releases upload app.aab --track beta`"
- **Don't:** "Our revolutionary CLI platform leverages cutting-edge technology to streamline your app distribution workflow."
- **Do:** "GPC covers 127 API endpoints. Fastlane covers about 20."
- **Don't:** "GPC is the ultimate all-in-one solution for all your Play Store needs."

---

## 11. Proof Points

> To be populated as the project matures.

| Type | Status |
|------|--------|
| **Metrics** | TBD — API endpoint coverage count, cold start time, test coverage % |
| **Notable users** | TBD — target early adopters from Android community |
| **Testimonials** | TBD — collect from beta users |
| **Value themes** | Time saved per release, tools replaced, API coverage vs competitors |

### Early Proof Points (Available Now)
- 127 API endpoints mapped (vs ~20 for Fastlane supply)
- TypeScript + ESM (no Ruby runtime needed)
- <500ms target cold start (vs 2-3s for Fastlane)

---

## 12. Goals

| Goal | Detail |
|------|--------|
| **Primary business goal** | Become the default CLI for Google Play Store management |
| **Key conversion action** | `npm install -g gpc` / star the GitHub repo |
| **Success metric (6 months)** | 1,000 GitHub stars, 500 weekly npm downloads |
| **Success metric (12 months)** | 5,000 GitHub stars, 5,000 weekly npm downloads, adopted by 3+ notable OSS Android projects |
