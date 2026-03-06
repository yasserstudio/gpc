# Launch Strategy

> Applying the ORB Framework + Five-Phase Launch approach.

---

## Channel Strategy (ORB)

### Owned Channels (compound over time)

| Channel | Purpose | Priority |
|---------|---------|----------|
| **GitHub repo** | Primary distribution, issues, discussions, stars | P0 |
| **Documentation site** | VitePress — guides, API reference, recipes | P0 |
| **Blog / Changelog** | Release announcements, tutorials, "why we built this" | P1 |
| **Email list** | Launch announcements, updates, case studies | P2 |

### Rented Channels (speed, not stability)

| Channel | Why | Priority |
|---------|-----|----------|
| **Twitter/X** | Android dev community lives here. Thread-friendly format for CLI demos. | P0 |
| **Reddit** | r/androiddev (1M+), r/devops, r/commandline — high-intent audiences | P0 |
| **LinkedIn** | Engineering leads, DevOps, decision-makers | P1 |
| **YouTube** | Short demo videos, "5 min release automation" | P2 |
| **Hacker News** | Launch day Show HN — developer tool sweet spot | P1 |

### Borrowed Channels (someone else's audience)

| Channel | How | Priority |
|---------|-----|----------|
| **Android Weekly newsletter** | Submit for inclusion | P0 |
| **Dev podcasts** | Pitch story: "why Play Store management is broken" | P2 |
| **Android/DevOps influencers** | Send early access, ask for honest review | P1 |
| **Conference talks** | "Automating Play Store: Beyond Fastlane" — Droidcon, DevOps Days | P2 |
| **Integration partners** | GitHub Actions marketplace, Bitrise step, Codemagic integration | P1 |

---

## Five-Phase Launch Plan

### Phase 1: Internal Launch
> Goal: Validate core functionality with real apps

**Actions:**
- [ ] Use GPC to manage releases for your own apps
- [ ] Document every friction point and edge case
- [ ] Validate auth flows (service account, OAuth)
- [ ] Test in real CI/CD pipelines (GitHub Actions)
- [ ] Record terminal sessions for future marketing content
- [ ] Build a list of 20-30 Android developers to invite

**Exit criteria:** Successfully uploaded AAB, promoted tracks, and managed rollout for a real app using only GPC.

---

### Phase 2: Alpha Launch
> Goal: Get 20-50 early users, collect feedback

**Actions:**
- [ ] Create landing page (could be the GitHub README initially)
- [ ] Open GitHub repo (public)
- [ ] Publish to npm as `gpc@0.1.0-alpha.x`
- [ ] Personal outreach to 20-30 developers (DMs, not public posts)
- [ ] Create GitHub Discussions for feedback
- [ ] Set up issue templates (bug report, feature request)
- [ ] Write "Why I'm building GPC" blog post / Twitter thread

**Messaging:**
> "I'm building a CLI that covers the entire Google Play Developer API — not just uploads. Looking for early testers who manage Android releases. DM me for early access."

**Exit criteria:** 20+ users have installed and tried GPC. 10+ pieces of feedback collected.

---

### Phase 3: Beta Launch
> Goal: 200-500 users, start public marketing

**Actions:**
- [ ] Publish `gpc@0.x.0-beta.x` to npm
- [ ] Launch documentation site
- [ ] Twitter/X thread: "I built a CLI for the entire Google Play API. Here's why."
- [ ] Reddit posts: r/androiddev, r/devops
- [ ] Record 2-3 short demo videos (terminal recordings)
  - "Upload and release in 60 seconds"
  - "Staged rollout with vitals gating"
  - "Manage store listings from your terminal"
- [ ] Reach out to 5-10 Android influencers/content creators
- [ ] Submit to Android Weekly newsletter
- [ ] Write comparison content: "GPC vs Fastlane supply"
- [ ] Start collecting testimonials from alpha users

**Messaging:**
> "GPC covers 127 Google Play API endpoints from your terminal. Fastlane covers ~20. No Ruby required."

**Exit criteria:** 500+ GitHub stars, 200+ weekly npm downloads, 5+ external mentions.

---

### Phase 4: Early Access Launch
> Goal: 1,000+ users, establish credibility

**Actions:**
- [ ] Publish `gpc@0.x.0` (stable beta)
- [ ] Hacker News "Show HN" post
- [ ] Product Hunt preparation (build hunter relationships, gather testimonials)
- [ ] Publish detailed comparison pages (GPC vs Fastlane, GPC vs gradle-play-publisher)
- [ ] GitHub Actions marketplace action: `gpc-action`
- [ ] Case study: "How [Project X] automated their Play Store releases with GPC"
- [ ] Contributor guide + "good first issue" labels
- [ ] Conference talk submissions (Droidcon, DevOps Days, KotlinConf)
- [ ] Pitch to DevOps/Android podcasts

**Messaging:**
> "The Google Play CLI that Fastlane should have been. Full API coverage, TypeScript, CI/CD-native. Try it: `npx gpc releases upload app.aab --track beta`"

**Exit criteria:** 1,000+ GitHub stars, 500+ weekly npm downloads, 1+ conference talk accepted.

---

### Phase 5: Full Launch (v1.0)
> Goal: Become the default Play Store CLI

**Actions:**
- [ ] Publish `gpc@1.0.0` to npm
- [ ] Product Hunt launch
- [ ] Hacker News launch (if not done in Phase 4)
- [ ] Press/blog coverage push
- [ ] "Migrating from Fastlane to GPC" comprehensive guide
- [ ] Integration with popular CI platforms (official docs/steps)
- [ ] Plugin ecosystem launch (plugin-sdk, plugin-ci)
- [ ] Annual "State of Play Store Management" report (original data)
- [ ] Referral program for contributors/advocates

**Messaging:**
> "GPC v1.0 — the complete Google Play CLI. Upload, release, rollout, review, monitor — all from your terminal. `npm install -g gpc`"

---

## Product Hunt Strategy

### Preparation (4-6 weeks before)
- [ ] Build relationships with top hunters in developer tools category
- [ ] Prepare assets: logo, screenshots, GIF demos, tagline
- [ ] Craft listing: concise description, feature bullets, maker comment
- [ ] Line up 20+ supporters to upvote and comment day-of
- [ ] Prepare launch-day responses for every expected question
- [ ] Schedule launch for Tuesday-Thursday (best days)

### Launch Day
- [ ] Post at 12:01am PT
- [ ] Respond to every comment within 30 minutes
- [ ] Cross-promote on Twitter, Reddit, LinkedIn
- [ ] Email list announcement
- [ ] Monitor and engage all day

### Post-Launch
- [ ] Follow up with every commenter
- [ ] Convert Product Hunt traffic to GitHub stars + npm installs
- [ ] Write "Our Product Hunt launch: what worked" retrospective
- [ ] Update website with "Featured on Product Hunt" badge

---

## Content Calendar (First 12 Weeks)

| Week | Content | Channel |
|------|---------|---------|
| 1 | "Why I'm building GPC" story | Twitter thread + Blog |
| 2 | 60-second demo: upload & release | Twitter/X video + Reddit |
| 3 | "GPC vs Fastlane supply" comparison | Blog + Reddit |
| 4 | CI/CD recipe: GitHub Actions + GPC | Blog + Dev.to |
| 5 | "5 things you didn't know the Play Store API could do" | Twitter thread |
| 6 | Case study: automating multi-app releases | Blog |
| 7 | "Monitoring Android vitals from the terminal" demo | Twitter/X video |
| 8 | "Migrating from Fastlane to GPC" guide | Blog + Reddit |
| 9 | Open source contributor spotlight | Twitter + LinkedIn |
| 10 | "Automating staged rollouts with vitals gating" | Blog + YouTube |
| 11 | Product Hunt launch prep teasers | Twitter + LinkedIn |
| 12 | **Product Hunt launch** | All channels |

---

## Launch Metrics & Goals

| Metric | Alpha | Beta | Early Access | v1.0 |
|--------|-------|------|-------------|------|
| GitHub stars | 50 | 500 | 1,000 | 5,000 |
| npm weekly downloads | 20 | 200 | 500 | 5,000 |
| Contributors | 1 | 3 | 10 | 25 |
| Twitter followers | - | 200 | 500 | 2,000 |
| Discord/Discussions members | 10 | 50 | 200 | 500 |
| External blog mentions | 0 | 2 | 10 | 25 |
