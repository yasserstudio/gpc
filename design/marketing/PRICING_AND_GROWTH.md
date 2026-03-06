# Pricing, Growth & Community Strategy

---

## Pricing Model: Open-Core

### Free Tier (MIT Licensed CLI)
Everything in the `gpc` npm package — the full CLI covering all 127 API endpoints.

**Why free:**
- Developer tools win through adoption, not paywalls
- Open source builds trust, contributions, and community
- Distribution via `npx gpc` has zero friction
- The CLI itself is the growth engine

### Future Revenue Opportunities (v2+)

| Opportunity | Model | When |
|-------------|-------|------|
| **GPC Cloud** | SaaS — hosted release dashboard, team management, audit logs | Post v1.0 |
| **Premium Plugins** | One-time or subscription — Slack integration, PagerDuty alerts, advanced reporting | Post plugin-sdk |
| **Enterprise Support** | Annual contract — SLA, dedicated support, custom integrations | Post 1,000+ orgs |
| **Managed CI/CD** | Usage-based — hosted release pipelines | Long-term |
| **Training / Consulting** | Per-engagement — migration services, release process audits | Anytime |

### Pricing Principles
1. The CLI is **always free and open source** — never paywall core functionality
2. Revenue comes from **convenience, collaboration, and enterprise needs** — not from withholding features
3. Pricing scales with team size and usage, not per-developer seat counting
4. Transparent public pricing — no "contact sales" until true enterprise tier

---

## Growth Strategy

### Growth Flywheel

```
Developer discovers GPC
        │
        ▼
Installs: npm install -g gpc
        │
        ▼
Uses for first release (Aha moment)
        │
        ▼
Adds to CI/CD pipeline (Stickiness)
        │
        ▼
Team adopts (Expansion)
        │
        ▼
Stars repo / tells others (Advocacy)
        │
        ▼
More developers discover GPC ──► (loop)
```

### Growth Levers

#### 1. Product-Led Growth
| Lever | Implementation |
|-------|---------------|
| **npx gpc** | Zero-install trial — users can try before installing globally |
| **gpc doctor** | Onboarding diagnostic — validates setup, suggests fixes |
| **Error messages** | Every error includes actionable suggestion + docs link |
| **Powered-by attribution** | CI logs: "Deployed via GPC v1.2.0" with link |
| **Shell completions** | `gpc completion zsh` — reduces friction, increases stickiness |
| **Interactive mode** | Guided workflows for first-time users |

#### 2. Content-Led Growth
| Lever | Implementation |
|-------|---------------|
| **SEO** | Target "google play cli," "fastlane alternative," "play store api" |
| **Comparison pages** | GPC vs Fastlane, GPC vs gradle-play-publisher |
| **CI/CD recipes** | GitHub Actions, GitLab CI, Bitbucket — searchable, copy-pasteable |
| **API guides** | "The Complete Google Play Developer API Guide" — definitive reference |

#### 3. Community-Led Growth
| Lever | Implementation |
|-------|---------------|
| **GitHub Discussions** | Q&A, feature requests, show & tell |
| **Discord** | Real-time help, community building |
| **Contributors** | "Good first issue" labels, contributor spotlight |
| **Plugin ecosystem** | Third-party plugins extend reach and community |

#### 4. Integration-Led Growth
| Lever | Implementation |
|-------|---------------|
| **GitHub Actions marketplace** | Official `gpc-action` — appears in Actions search |
| **Bitrise step** | Listed in Bitrise step library |
| **CI template repos** | Starter templates with GPC pre-configured |
| **VS Code extension** | Command palette integration (long-term) |

---

## Referral & Advocacy Program

### Organic Advocacy (v1.0+)
No formal program needed initially — focus on making the product worth talking about.

**Trigger moments for word-of-mouth:**
1. First successful release via GPC ("This actually works!")
2. Replacing a complex Fastlane setup ("Deleted 200 lines of Fastfile")
3. Discovering a feature competitors lack ("Wait, I can check vitals from the CLI?")
4. Adding GPC to CI and it just works ("3 lines of YAML replaced our release script")

**Amplification tactics:**
- Ask happy users to star the repo (in CLI output after first successful release? Tastefully.)
- Retweet/share user testimonials
- Feature community contributions in changelog
- "Built with GPC" badge for README files

### Formal Referral Program (Post v1.0)
| Element | Design |
|---------|--------|
| **Trigger** | After 5th successful release via GPC |
| **Ask** | "Enjoying GPC? Star us on GitHub or share with a colleague." |
| **Incentive** | Contributor credit, early access to new features, swag |
| **Mechanism** | In-CLI prompt (dismissable, shown once) |

### Community Champions Program (Post 1,000 stars)
| Tier | Criteria | Benefits |
|------|----------|----------|
| **Contributor** | 1+ merged PR | Name in CONTRIBUTORS.md, Discord role |
| **Advocate** | 5+ community answers or 3+ PRs | Early access to features, swag pack |
| **Champion** | Plugin author or major contributor | Advisory input, conference sponsorship, co-marketing |

---

## Marketing Ideas (Prioritized for GPC)

### Quick Wins (Pre-Launch → Month 3)
| # | Idea | Effort | Impact |
|---|------|--------|--------|
| 1 | "Why I'm building GPC" Twitter thread | Low | Awareness |
| 2 | Submit to Android Weekly newsletter | Low | Reach |
| 3 | Post to r/androiddev with demo | Low | Early users |
| 4 | Show HN post | Low | Developer reach |
| 5 | Dev.to cross-posts | Low | SEO + reach |
| 6 | Terminal recording GIFs in README | Low | Conversion |

### Medium-Term (Month 3 → 6)
| # | Idea | Effort | Impact |
|---|------|--------|--------|
| 7 | Comparison pages (vs Fastlane) | Medium | SEO + conversion |
| 8 | GitHub Actions marketplace action | Medium | Distribution |
| 9 | Conference talk submission (Droidcon) | Medium | Credibility |
| 10 | "Complete Play API Guide" pillar content | Medium | SEO authority |
| 11 | Podcast tour (Android Backstage, Fragmented) | Medium | Reach |
| 12 | Integration with Bitrise / Codemagic | Medium | Distribution |

### Long-Term (Month 6 → 12)
| # | Idea | Effort | Impact |
|---|------|--------|--------|
| 13 | Plugin ecosystem launch | High | Stickiness |
| 14 | Annual "State of Play Store Automation" report | High | Authority |
| 15 | Free tool: Play Store metadata validator | Medium | Lead gen |
| 16 | YouTube tutorial series | High | Evergreen reach |
| 17 | Enterprise case studies | Medium | B2B credibility |
| 18 | Conference sponsorship (Droidcon) | High | Brand awareness |

---

## Social Media Strategy

### Platform Focus

| Platform | Role | Cadence | Content Type |
|----------|------|---------|-------------|
| **Twitter/X** | Primary — real-time engagement, dev community | 3-5x/week | Threads, demos, hot takes, changelogs |
| **Reddit** | Discovery — high-intent communities | 2-3x/month | Tutorials, comparisons, launch announcements |
| **LinkedIn** | B2B — engineering leads, decision-makers | 1-2x/week | Insights, case studies, milestones |
| **Dev.to / Hashnode** | SEO — cross-posted content | 1x/week | Blog cross-posts |
| **YouTube** | Evergreen — tutorials and demos | 2x/month | Terminal recordings, walkthroughs |

### Content Mix (Twitter/X)
| Type | Percentage | Example |
|------|-----------|---------|
| Educational | 35% | "TIL: Google Play API lets you query ANR rates by device model. Here's how with GPC..." |
| Product updates | 25% | "GPC v0.3.0: subscription management is here. `gpc subscriptions list`" |
| Behind-the-scenes | 20% | "Spent the weekend mapping every Play API endpoint. There are 127 of them. Here's what I found..." |
| Community | 15% | Retweets, contributor spotlights, user showcases |
| Personal / Opinion | 5% | "Hot take: Fastlane was great for 2018. It's 2026 and we shouldn't need Ruby to ship Android apps." |

### Hook Templates for GPC Content
- "I replaced our entire Fastlane setup with 3 commands. Here's how:"
- "Google Play has 127 API endpoints. Most developers use 5. Here are the ones you're missing:"
- "Our release process used to take 30 minutes. Now it takes 12 seconds."
- "Stop opening the Play Console. You can do [thing] from your terminal:"
- "Unpopular opinion: Fastlane is technical debt for Android teams in 2026."

---

## Key Metrics Dashboard

### Awareness
| Metric | Target (6mo) | Target (12mo) |
|--------|-------------|--------------|
| GitHub stars | 1,000 | 5,000 |
| Twitter followers | 500 | 2,000 |
| Monthly blog visitors | 2,000 | 10,000 |

### Adoption
| Metric | Target (6mo) | Target (12mo) |
|--------|-------------|--------------|
| npm weekly downloads | 500 | 5,000 |
| Monthly active users (telemetry opt-in) | 200 | 2,000 |
| CI/CD integrations | 50 | 500 |

### Engagement
| Metric | Target (6mo) | Target (12mo) |
|--------|-------------|--------------|
| GitHub contributors | 10 | 25 |
| Discord members | 200 | 500 |
| Community plugins | 0 | 5 |

### Conversion
| Metric | Target (6mo) | Target (12mo) |
|--------|-------------|--------------|
| Star-to-install ratio | 50% | 50% |
| Install-to-weekly-active | 30% | 40% |
| Docs visit-to-install | 10% | 15% |
