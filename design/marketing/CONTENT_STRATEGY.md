# Content Strategy

---

## Content Pillars

### Pillar 1: Play Store Automation (40%)
> Tutorials, guides, and recipes for automating every aspect of Play Store management.

**Subtopics:**
- Release automation (upload, promote, rollout)
- CI/CD integration (GitHub Actions, GitLab, Bitbucket, CircleCI)
- Metadata sync (listings, screenshots, localization)
- Staged rollout strategies
- Multi-app management
- Migration guides (from Fastlane, from manual workflows)

**Search targets:** "automate play store release," "google play ci cd," "upload aab github actions," "fastlane alternative android"

### Pillar 2: Android App Monitoring (25%)
> Using CLI-accessible data to monitor app health and quality.

**Subtopics:**
- Crash rate monitoring and alerting
- ANR tracking and debugging
- Startup time optimization
- Vitals-gated rollouts
- Review sentiment tracking
- Custom monitoring pipelines

**Search targets:** "google play vitals api," "android crash rate monitoring," "anr rate threshold," "play store review monitoring"

### Pillar 3: Google Play Developer API (20%)
> Deep dives into the API itself — what's possible, what's undocumented, what's tricky.

**Subtopics:**
- API endpoint guides (one per domain)
- Edit lifecycle explained
- Authentication deep dives
- Rate limiting and quotas
- Subscription and IAP management via API
- API changelog and migration notes

**Search targets:** "google play developer api tutorial," "play developer api authentication," "google play api subscription management"

### Pillar 4: Release Engineering for Android (15%)
> Broader thought leadership on Android release practices.

**Subtopics:**
- Release train patterns for mobile
- Versioning strategies (version codes, version names)
- Feature flags and staged rollouts
- Release quality gates
- Team workflows for multi-track releases
- Post-release monitoring playbooks

**Search targets:** "android release process," "mobile release engineering," "staged rollout best practices," "android release management"

---

## Content by Buyer Stage

### Awareness (Top of Funnel)
> "I have this problem but don't know about GPC yet"

| Content | Format | Target Keyword |
|---------|--------|---------------|
| "The Complete Guide to Google Play Developer API" | Long-form guide | google play developer api |
| "How to Automate Android Releases in CI/CD" | Tutorial | automate android release ci cd |
| "Google Play Vitals: What They Mean and How to Fix Them" | Guide | google play vitals explained |
| "Why Your Android Release Process Is Broken" | Opinion piece | android release process |
| "Managing Multiple Android Apps at Scale" | Guide | manage multiple android apps |

### Consideration (Middle of Funnel)
> "I know I need a tool — which one?"

| Content | Format | Target Keyword |
|---------|--------|---------------|
| "GPC vs Fastlane supply: A Detailed Comparison" | Comparison | fastlane supply alternative |
| "Best Tools for Google Play Store Automation" | Listicle | google play store automation tools |
| "GPC vs gradle-play-publisher: When to Use Which" | Comparison | gradle play publisher alternative |
| "Top 5 Fastlane Alternatives for Android in 2026" | Listicle | fastlane alternatives android |
| "Command-Line Tools for Android Developers" | Roundup | android developer cli tools |

### Decision (Bottom of Funnel)
> "I want GPC — how do I get started?"

| Content | Format | Target Keyword |
|---------|--------|---------------|
| "Getting Started with GPC" | Tutorial | gpc cli getting started |
| "Setting Up GPC in GitHub Actions" | Recipe | gpc github actions |
| "Migrating from Fastlane to GPC" | Migration guide | migrate fastlane to gpc |
| "GPC Configuration Guide" | Reference | gpc configuration |
| "GPC Authentication: Service Accounts, OAuth, and ADC" | Guide | gpc authentication setup |

### Retention (Post-Adoption)
> "I use GPC — help me do more"

| Content | Format | Target Keyword |
|---------|--------|---------------|
| "Advanced GPC Recipes" | Collection | gpc advanced usage |
| "Building Custom GPC Plugins" | Tutorial | gpc plugin development |
| "Automating Staged Rollouts with Vitals Gating" | Recipe | automated staged rollout android |
| "Managing Subscriptions and IAP from the Terminal" | Guide | manage subscriptions google play api |
| Changelog / Release Notes | Updates | gpc changelog |

---

## Competitor & Alternative Pages

### Priority Pages (by search volume and intent)

| Page | URL | Format | Priority |
|------|-----|--------|----------|
| Fastlane Supply Alternative | `/alternatives/fastlane-supply` | Singular alternative | P0 |
| GPC vs Fastlane | `/vs/fastlane` | Direct comparison | P0 |
| Fastlane Alternatives for Android | `/alternatives/fastlane-alternatives` | Plural alternatives | P1 |
| GPC vs gradle-play-publisher | `/vs/gradle-play-publisher` | Direct comparison | P1 |
| Google Play Console CLI Tools | `/alternatives/play-console-cli-tools` | Category page | P2 |

### Comparison Content Principles
- Be honest about competitor strengths
- Lead with factual differences (endpoint count, startup time, runtime)
- Include "who each tool is best for" — GPC isn't always the answer
- Provide migration paths
- Update quarterly

---

## SEO Strategy

### Technical SEO Priorities
1. VitePress docs site with clean URLs, sitemap, and fast load
2. Schema markup on docs pages (SoftwareApplication, HowTo, FAQ)
3. GitHub README optimized for "google play cli" and related terms
4. npm package description optimized for discovery

### Target Keywords by Priority

**High priority (Phase 1-2):**
- google play cli
- google play developer api
- fastlane supply alternative
- automate google play release
- upload aab command line

**Medium priority (Phase 3-4):**
- google play vitals api
- android release automation
- play store metadata sync
- google play review api
- android staged rollout

**Long-tail (ongoing):**
- how to upload aab to google play from terminal
- github actions google play release
- google play developer api authentication
- fastlane supply vs gpc
- manage google play subscriptions api

### Programmatic SEO Opportunities
- `/commands/<command>` — one page per CLI command (auto-generated from help text)
- `/api/<endpoint>` — one page per API endpoint with GPC usage examples
- `/recipes/<recipe>` — CI/CD recipes by platform and use case

---

## Content Repurposing System

```
Blog Post / Guide (pillar content)
    │
    ├── Twitter/X thread (key insights)
    ├── Reddit post (r/androiddev, r/devops)
    ├── LinkedIn post (for engineering leads)
    ├── Dev.to cross-post
    ├── Terminal recording / GIF (for visual learners)
    └── Newsletter mention
```

### Repurposing Cadence
- Publish pillar content on blog (Monday)
- Twitter/X thread with key takeaways (Tuesday)
- Reddit post in relevant subreddit (Wednesday)
- LinkedIn post for B2B audience (Thursday)
- Cross-post to Dev.to (Friday)

---

## Content Prioritization

### Scoring Matrix (per content piece)

| Factor | Weight | Score 1-5 |
|--------|--------|-----------|
| **Customer Impact** — does this address a real pain? | 40% | |
| **Content-Market Fit** — can we naturally show GPC? | 30% | |
| **Search Potential** — is there keyword volume? | 20% | |
| **Resource Required** — can we produce this quickly? | 10% | |

### First 10 Pieces (Prioritized)

| # | Title | Type | Score |
|---|-------|------|-------|
| 1 | Getting Started with GPC | Tutorial | Foundation |
| 2 | "Why I'm building GPC" | Story / Thread | Launch content |
| 3 | GPC vs Fastlane supply | Comparison | High intent |
| 4 | Setting Up GPC in GitHub Actions | Recipe | High intent |
| 5 | The Complete Guide to Google Play Developer API | Guide | Awareness |
| 6 | Migrating from Fastlane to GPC | Migration guide | High intent |
| 7 | Automating Staged Rollouts | Tutorial | Pillar 1 |
| 8 | Monitoring Android Vitals from the Terminal | Tutorial | Pillar 2 |
| 9 | Managing Play Store Listings from the CLI | Tutorial | Pillar 1 |
| 10 | Top Fastlane Alternatives for Android | Listicle | Consideration |
