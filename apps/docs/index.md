---
layout: home
title: "GPC -- Google Play Console CLI | Ship Android Releases from Your Terminal"
description: "The complete Google Play CLI. 217 API endpoints including Managed Google Play. Upload AABs, manage releases, monitor vitals, sync metadata, publish private enterprise apps. No Ruby, no browser."

hero:
  name: "GPC"
  text: "Google Play Console CLI"
  tagline: "217 API endpoints. Releases, vitals, reviews, subscriptions, preflight scanning, Managed Google Play. One CLI, no browser."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View Commands
      link: /commands/

features:
  - icon:
      src: /icons/goal.png
    title: 217 API Endpoints
    details: "Releases, vitals, reviews, subscriptions, purchases, reports, Managed Google Play, and more. Fastlane covers ~20. GPC covers everything."
  - icon:
      src: /icons/plug.png
    title: Translated Release Notes
    details: "Turn your git log into per-locale Play Store 'What's new' text in one command. Translate via your own LLM key. Supports Anthropic, OpenAI, Google, and Vercel AI Gateway."
  - icon:
      src: /icons/shield.png
    title: Preflight Scanner
    details: "9 offline policy checks on your AAB before upload. Catches rejections before they happen. No other tool does this."
  - icon:
      src: /icons/lightning-bolt.png
    title: CI/CD Native
    details: "JSON output when piped. Semantic exit codes. Env var config. --dry-run on every write. Drop into any pipeline."
  - icon:
      src: /icons/delivery-box.png
    title: Managed Google Play
    details: "First publishing CLI to support the Play Custom App API. Publish private enterprise apps in 5 minutes via CI/CD instead of 2 hours in Play Console."
  - icon:
      src: /icons/analytics.png
    title: Monitor Releases in Real Time
    details: "gpc status for a snapshot. gpc watch for real-time rollout monitoring with auto-halt on threshold breach. Exit code 6 for CI."
---

<div class="stats-bar">
  <div class="stat-item">
    <span class="stat-number">217</span>
    <span class="stat-label">API Endpoints</span>
  </div>
  <div class="stat-item">
    <span class="stat-number">2,343</span>
    <span class="stat-label">Tests</span>
  </div>
  <div class="stat-item">
    <span class="stat-number">90%+</span>
    <span class="stat-label">Coverage</span>
  </div>
  <div class="stat-item">
    <span class="stat-number">Free</span>
    <span class="stat-label">to Use</span>
  </div>
</div>

<section class="home-section section-coverage">
<div class="section-inner">

<h2 class="section-title">What GPC Covers</h2>

<div class="coverage-grid">
<a href="/commands/releases" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
<h3>Releases</h3>
<p>Upload, promote, staged rollouts, halt, resume, release notes with AI translation</p>
</a>
<a href="/commands/listings" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>
<h3>Listings</h3>
<p>Store metadata, screenshots, localization, Fastlane format compatible</p>
</a>
<a href="/commands/reviews" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
<h3>Reviews</h3>
<p>Filter by stars, language, date. Reply, export to CSV</p>
</a>
<a href="/commands/vitals" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
<h3>Vitals</h3>
<p>Crashes, ANR, startup, rendering, battery, memory with CI threshold gates</p>
</a>
<a href="/commands/watch" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
<h3>Monitoring</h3>
<p>Real-time rollout monitoring, 6 vitals metrics, auto-halt, webhooks</p>
</a>
<a href="/commands/subscriptions" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
<h3>Monetization</h3>
<p>Subscriptions, base plans, offers, in-app products, purchase verification, refunds, pricing</p>
</a>
<a href="/commands/testers" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
<h3>Team</h3>
<p>Testers, users, permissions, financial and stats reports, CSV bulk import</p>
</a>
<a href="/commands/preflight" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
<h3>Compliance</h3>
<p>Preflight scanner (9 checks), signing audit, developer verification, data safety</p>
</a>
<a href="/commands/bundle" class="coverage-card">
<div class="coverage-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
<h3>Analysis</h3>
<p>Bundle size breakdown, cross-build comparison, size CI gates</p>
</a>
</div>

<p class="coverage-link"><a href="/commands/">View the full command reference</a></p>

</div>
</section>

<section class="home-section section-compare">
<div class="section-inner">

<h2 class="section-title">How GPC compares</h2>

<div class="compare-table-wrap">

|                     | **GPC**                      | Fastlane supply | gradle-play-publisher | Console UI   |
| ------------------- | ---------------------------- | --------------- | --------------------- | ------------ |
| API coverage        | **217 endpoints**            | ~20             | ~15                   | All (manual) |
| Runtime             | Node.js or standalone binary | Ruby + Bundler  | JVM                   | Browser      |
| Cold start          | **<500ms**                   | 2-3s            | 3-5s                  | 5-10s        |
| Reviews & Vitals    | Yes                          | No              | No                    | Manual       |
| Subscriptions & IAP | Yes                          | No              | No                    | Manual       |
| Managed Google Play | **Yes (first CLI)**          | No              | No                    | Manual       |
| AI translation      | **Yes (BYO key)**            | No              | No                    | No           |
| CI/CD native        | JSON + exit codes + env vars | Partial         | Gradle tasks          | No           |
| Preflight scanner   | **9 offline checks**         | No              | No                    | No           |
| Plugin system       | Yes                          | No              | No                    | No           |

</div>

<p class="compare-note">Already on Fastlane? See the <a href="/migration/from-fastlane">migration guide</a> or the <a href="/alternatives/fastlane">full comparison</a>.</p>

</div>
</section>

<section class="home-section section-cta">
<div class="section-inner">
<div class="cta-block">
<h2 class="cta-title">Ready to stop clicking?</h2>
<p class="cta-subtitle">Free to use. Works with your existing Google Play service account. Every write operation supports <code>--dry-run</code>.</p>

<div class="cta-links">
<a href="/guide/quick-start" class="cta-btn cta-primary">Get started</a>
<a href="/commands/" class="cta-btn cta-secondary">View commands</a>
</div>
</div>
</div>
</section>
