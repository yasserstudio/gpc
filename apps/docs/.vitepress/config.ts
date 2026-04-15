import { defineConfig, type PageData } from "vitepress";

// ── Sidebar icon helpers ─────────────────────────────────────────
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const si = (icon: string, label: string) =>
  `<span class="si" aria-hidden="true">${icon}</span>${label}`;

const ICONS = {
  bookOpen: svg(
    `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  ),
  terminal: svg(`<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>`),
  layers: svg(
    `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  ),
  activity: svg(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
  dollar: svg(
    `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  ),
  users: svg(
    `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  ),
  pkg: svg(
    `<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
  ),
  shieldCheck: svg(
    `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>`,
  ),
  cpu: svg(
    `<rect x="9" y="9" width="6" height="6"/><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="9" y1="2" x2="9" y2="9"/><line x1="15" y1="2" x2="15" y2="9"/><line x1="9" y1="15" x2="9" y2="22"/><line x1="15" y1="15" x2="15" y2="22"/><line x1="2" y1="9" x2="9" y2="9"/><line x1="2" y1="15" x2="9" y2="15"/><line x1="15" y1="9" x2="22" y2="9"/><line x1="15" y1="15" x2="22" y2="15"/>`,
  ),
  settings: svg(
    `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  ),
  gitBranch: svg(
    `<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>`,
  ),
  layout: svg(
    `<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>`,
  ),
  plug: svg(
    `<path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v5"/><path d="M5 8h14v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V8z"/>`,
  ),
  wrench: svg(
    `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  ),
  book: svg(
    `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
  ),
  arrowRight: svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`),
};

function getPageDescription(page: PageData): string {
  const path = page.relativePath;
  const map: Record<string, string> = {
    "index.md":
      "The complete Google Play CLI. 217 API endpoints including Managed Google Play (first CLI to support it). Upload AABs, manage releases, monitor vitals, sync metadata, publish private enterprise apps. No Ruby, no browser.",
    "guide/index.md":
      "Get started with GPC, the Play Console command line tool. Install, authenticate, and ship your first release in minutes. Fastlane supply alternative with 217 endpoints and Managed Google Play support.",
    "guide/installation.md":
      "Install GPC via npm, Homebrew, or standalone binary. No Ruby, no JVM. Works on macOS, Linux, and Windows.",
    "guide/authentication.md":
      "Authenticate GPC with a service account, OAuth 2.0, or Application Default Credentials. Full setup guide for Play Console.",
    "guide/quick-start.md":
      "Five minutes to your first release. Authenticate, upload, promote, check vitals, and monitor reviews with GPC.",
    "commands/index.md":
      "Complete command reference for GPC — the Google Play Console CLI. 30+ commands covering every Play Console operation.",
    "commands/status.md":
      "gpc status — App health at a glance. Releases, vitals, and reviews in one command. Six parallel API calls in under 3 seconds.",
    "commands/releases.md":
      "gpc releases — Upload AAB from the command line, promote releases, manage staged rollouts, and automate Play Store releases in CI/CD.",
    "commands/vitals.md":
      "gpc vitals — Monitor Android crash rates, ANR, startup times, and rendering from the command line. Google Play vitals CLI with CI threshold gates.",
    "commands/reviews.md":
      "gpc reviews — List, filter, reply to, and export user reviews. Filter by stars, language, date.",
    "commands/listings.md":
      "gpc listings — Sync Play Store metadata, screenshots, and localizations from local files. Fastlane supply compatible metadata directory format.",
    "commands/publish.md":
      "gpc publish — End-to-end release in one command. Upload, assign track, and commit. Use gpc validate for dry-run.",
    "commands/subscriptions.md":
      "gpc subscriptions — Manage subscriptions, base plans, and offers using the modern Google Play monetization API.",
    "ci-cd/index.md":
      "Integrate GPC into GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI. Semantic exit codes, JSON output, vitals gates.",
    "ci-cd/github-actions.md":
      "Android release automation with GitHub Actions and GPC. Upload AAB, promote releases, gate rollouts on crash rates. CI/CD for Google Play.",
    "migration/from-fastlane.md":
      "Migrate from Fastlane supply to GPC — the modern Fastlane alternative for Android. Command mapping, metadata migration, and CI workflow examples.",
    "reference/environment-variables.md":
      "All GPC_* environment variables — authentication, output, network, debugging, and proxy configuration.",
    "reference/exit-codes.md":
      "GPC semantic exit codes: 0 success, 2 usage, 3 auth, 4 API, 5 network, 6 vitals threshold breach. CI scripting patterns.",
    "reference/changelog.md": "GPC changelog — all notable changes across every release.",
    "advanced/architecture.md": "GPC system design, package architecture, and dependency graph.",
    "advanced/security.md":
      "GPC security model — credential handling, secrets redaction, audit logging, and threat model.",
    "advanced/plugins.md":
      "Build GPC plugins with lifecycle hooks and custom commands using the @gpc-cli/plugin-sdk.",
    "advanced/sdk-usage.md":
      "Google Play API TypeScript SDK — use @gpc-cli/api and @gpc-cli/auth as standalone libraries in any Node.js project. Typed client for all 217 endpoints including Play Custom App Publishing.",
    "commands/preflight.md":
      "gpc preflight — Scan your AAB against Google Play policies before submission. Offline, free, CI-ready. The missing compliance tool for Android.",
    "commands/init.md":
      "gpc init — Scaffold project config, metadata directory, and CI templates for Google Play Console CLI.",
    "commands/diff.md":
      "gpc diff — Preview release state and pending changes before publishing. Read-only, no mutations.",
    "commands/changelog.md":
      "gpc changelog — View release history and what changed across versions.",
    "commands/rtdn.md":
      "gpc rtdn — Real-Time Developer Notifications. Decode Pub/Sub payloads, check configuration, debug subscription events.",
    // Guide
    "guide/configuration.md":
      "Configure GPC with .gpcrc.json, environment variables, and named profiles. XDG paths, precedence rules, and multi-app setup.",
    "guide/developer-verification.md":
      "Android developer verification and app registration — what's changing, the timeline, and how GPC helps you stay compliant.",
    "guide/enterprise-publishing.md":
      "Publish private apps to Managed Google Play via the Play Custom App Publishing API. Full walkthrough from account setup to CI/CD.",
    "guide/screenshots.md":
      "Manage Google Play store media with GPC. Screenshots, feature graphics, icons, and TV banners. Image requirements, bulk sync workflows, localization, CI/CD recipes.",
    "guide/multi-account.md":
      "Manage multiple Google Play developer accounts with GPC profiles. Agency workflows, per-customer CI pipelines, service account key management, permission model, and limitations.",
    "commands/verify.md":
      "gpc verify — Android developer verification status, enforcement deadlines, and resources. Check your account and open verification pages.",
    "guide/faq.md":
      "Frequently asked questions about GPC — authentication, CI/CD, Fastlane migration, troubleshooting, and production readiness.",
    // Commands — monetization
    "commands/one-time-products.md":
      "gpc one-time-products — Create, update, and manage one-time products and purchase options on Google Play.",
    "commands/purchase-options.md":
      "gpc purchase-options — Manage purchase options for one-time products on Google Play.",
    "commands/iap.md":
      "gpc iap — Legacy in-app products API. Use one-time-products for the modern API.",
    "commands/purchases.md":
      "gpc purchases — Verify purchases, manage subscriptions, process refunds, list voided purchases, and query orders.",
    "commands/pricing.md":
      "gpc pricing — Convert regional pricing across currencies with purchasing power parity via the Google Play API.",
    // Commands — distribution
    "commands/tracks.md":
      "gpc tracks — List, create, and manage release tracks (internal, alpha, beta, production, custom).",
    "commands/bundle.md":
      "gpc bundle — Analyze AAB/APK size per module and category. Compare builds. CI size gates with --threshold.",
    "commands/internal-sharing.md":
      "gpc internal-sharing — Upload AAB or APK for internal app sharing. Quick testing without creating a release.",
    "commands/generated-apks.md":
      "gpc generated-apks — List and download APKs generated by Google Play from your App Bundle.",
    "commands/system-apks.md":
      "gpc system-apks — Create, list, and download system APKs for OEM pre-installs from published App Bundles.",
    "commands/device-tiers.md":
      "gpc device-tiers — Manage device tier configurations for conditional delivery on Google Play.",
    // Commands — compliance
    "commands/data-safety.md":
      "gpc data-safety — View and update your app's data safety declaration on Google Play.",
    "commands/recovery.md":
      "gpc recovery — Create, deploy, and manage app recovery actions for critical issues.",
    "commands/external-transactions.md":
      "gpc external-transactions — Report and manage external transactions for alternative billing.",
    // Commands — monitoring
    "commands/anomalies.md":
      "gpc anomalies — Detect vitals quality spikes automatically via the Google Play Reporting API.",
    "commands/quota.md":
      "gpc quota — View Google Play API quota usage tracked from local audit log.",
    // Commands — team
    "commands/apps.md": "gpc apps — List accessible apps from your Google Play developer account.",
    "commands/auth.md":
      "gpc auth — Authenticate with service accounts, OAuth, or ADC. Manage profiles and tokens.",
    "commands/config.md":
      "gpc config — View and manage GPC configuration. Set defaults, manage profiles, initialize config files.",
    "commands/users.md":
      "gpc users — Manage developer account users, invite team members, and control access permissions.",
    "commands/testers.md":
      "gpc testers — Add, remove, import, and export testers for any track on Google Play.",
    "commands/grants.md":
      "gpc grants — Manage per-app permission grants for developer account users.",
    "commands/reports.md":
      "gpc reports — Download financial and statistics reports from Google Play.",
    // Commands — system
    "commands/plugins.md":
      "gpc plugins — List, install, and manage GPC plugins for custom workflows.",
    "commands/install-skills.md":
      "gpc install-skills — Install AI agent skills for Claude Code, Cursor, and other AI coding assistants.",
    "commands/utility.md":
      "GPC utility commands — version, update, cache, feedback, completion, and docs.",
    "commands/migrate.md":
      "gpc migrate — Migrate from Fastlane supply to GPC. Converts metadata, config, and CI workflows.",
    "commands/train.md":
      "gpc train — Automated staged rollout pipeline with time gates and crash/ANR quality gates.",
    "commands/games.md":
      "gpc games — Manage Play Games Services leaderboards, achievements, and events.",
    "commands/enterprise.md":
      "gpc enterprise — Manage private enterprise app distribution via Managed Google Play.",
    // CI/CD
    "ci-cd/gitlab-ci.md":
      "Use GPC in GitLab CI to automate Google Play releases, vitals monitoring, and metadata sync.",
    "ci-cd/bitbucket.md":
      "Use GPC in Bitbucket Pipelines to automate Google Play releases and quality gates.",
    "ci-cd/circleci.md":
      "Use GPC in CircleCI to automate Google Play releases and vitals-gated deployments.",
    "ci-cd/vitals-gates.md":
      "Gate deployments on crash and ANR rates. Exit code 6 halts your pipeline when thresholds are breached.",
    // Migration
    "migration/from-console-ui.md":
      "Replace Play Console UI workflows with GPC CLI commands. 60+ task-to-command mappings.",
    // Alternatives
    "alternatives/fastlane.md":
      "GPC vs Fastlane supply: 217 endpoints vs ~20, Node.js vs Ruby, plus vitals, reviews, subscriptions, preflight scanning, and Managed Google Play private app publishing.",
    "alternatives/index.md":
      "Google Play CLI tools compared. GPC vs Fastlane vs gradle-play-publisher vs play-console-cli. Feature matrix and API coverage.",
    "alternatives/android-release-automation.md":
      "Automate Android releases with GPC. Upload, promote, staged rollout, vitals gating, and monitoring from the command line or CI/CD.",
    // Reference
    "reference/json-contract.md":
      "GPC JSON output contract — structured response format for CI/CD scripting and automation.",
    "reference/api-coverage.md":
      "Complete Google Play Developer API coverage map. 217 endpoints across Android Publisher v3, Play Developer Reporting, and Play Custom App Publishing.",
    "reference/deprecations.md":
      "Deprecated Google Play API endpoints and GPC commands. Migration timelines and replacement commands.",
    // Advanced
    "advanced/conventions.md":
      "GPC code conventions — TypeScript strict mode, ESM, named exports, testing patterns, git workflow.",
    "advanced/error-codes.md":
      "All GPC error codes with causes, exit codes, and suggested fixes. 40+ typed errors.",
    "advanced/troubleshooting.md":
      "Troubleshoot GPC — common errors, auth failures, upload issues, network problems, and debug mode.",
    "advanced/skills.md":
      "16 AI agent skills for GPC — teach Claude Code, Cursor, and other AI assistants to use Google Play CLI.",
  };
  return map[path] ?? `GPC documentation — ${page.title ?? "Google Play Console CLI"}`;
}

export default defineConfig({
  title: "GPC — Google Play Console CLI",
  description:
    "The complete Google Play CLI. 217 API endpoints including Managed Google Play. Upload AABs, manage releases and rollouts, monitor vitals and crash rates, sync metadata, publish private enterprise apps. No Ruby, no browser.",

  base: "/gpc/",
  lang: "en-US",
  cleanUrls: true,
  metaChunk: true,

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark-dimmed",
    },
    lineNumbers: true,
    image: { lazyLoading: true },
  },

  head: [
    // Google Analytics 4
    ["script", { async: "", src: "https://www.googletagmanager.com/gtag/js?id=G-LS7V08EJHQ" }],
    [
      "script",
      {},
      "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-LS7V08EJHQ')",
    ],

    // Referrer-Policy is the only security header effective as a meta tag on GitHub Pages
    ["meta", { name: "referrer", content: "strict-origin-when-cross-origin" }],

    ["link", { rel: "icon", href: "/gpc/favicon.png", type: "image/png" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.gstatic.com" }],
    ["meta", { property: "og:type", content: "website" }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "GPC — Google Play Console CLI",
        description:
          "The complete Google Play CLI. 217 API endpoints including Managed Google Play. Upload AABs, manage releases, monitor crash rates, sync metadata, publish private enterprise apps. Fastlane alternative for Android.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "macOS, Linux, Windows",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        url: "https://yasserstudio.github.io/gpc/",
        downloadUrl: "https://www.npmjs.com/package/@gpc-cli/cli",
        installUrl: "https://www.npmjs.com/package/@gpc-cli/cli",
        codeRepository: "https://github.com/yasserstudio/gpc",

        programmingLanguage: "TypeScript",
        softwareVersion: "0.9.59",
        releaseNotes: "https://yasserstudio.github.io/gpc/reference/changelog",
        documentation: "https://yasserstudio.github.io/gpc/",
        author: { "@type": "Person", name: "yasserstudio", url: "https://github.com/yasserstudio" },
      }),
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "google play cli, play console command line tool, fastlane supply alternative, fastlane alternative android, upload aab command line, google play vitals cli, google play api typescript, android release automation, automate play store release, play store metadata sync, monitor android crash rate, google play rollout automation, aab upload ci cd",
      },
    ],
  ],

  lastUpdated: true,

  transformPageData(pageData) {
    const desc = getPageDescription(pageData);
    const title = pageData.title
      ? `${pageData.title} | GPC — Google Play Console CLI`
      : "GPC — Google Play Console CLI";
    const canonicalPath = pageData.relativePath.replace(/index\.md$/, "").replace(/\.md$/, "");
    const canonicalUrl = `https://yasserstudio.github.io/gpc/${canonicalPath}`;

    // Override VitePress default description with per-page description
    pageData.description = desc;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      // Canonical
      ["link", { rel: "canonical", href: canonicalUrl }],
      // Open Graph (dynamic per page)
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: desc }],
      ["meta", { property: "og:url", content: canonicalUrl }],
      [
        "meta",
        { property: "og:image", content: "https://yasserstudio.github.io/gpc/og-image.png" },
      ],
      // Twitter (dynamic per page)
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: desc }],
      [
        "meta",
        { name: "twitter:image", content: "https://yasserstudio.github.io/gpc/og-image.png" },
      ],
    );

    // FAQPage schema on FAQ page
    if (pageData.relativePath === "guide/faq.md") {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How is GPC different from Fastlane supply?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "GPC covers 217 Google Play API endpoints. Fastlane supply covers about 20. GPC adds reviews, vitals, subscriptions, reports, preflight scanning, and more. No Ruby required.",
            },
          },
          {
            "@type": "Question",
            name: "What authentication method should I use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Use a service account for CI/CD pipelines. Use OAuth for local development. Application Default Credentials work in Google Cloud environments.",
            },
          },
          {
            "@type": "Question",
            name: "Can I use GPC in CI/CD?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. GPC outputs JSON when piped, uses semantic exit codes (0-6), and supports env var configuration. Works with GitHub Actions, GitLab CI, Bitbucket, and CircleCI.",
            },
          },
          {
            "@type": "Question",
            name: "Is GPC free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. GPC is free to use. The code is on GitHub. No account or subscription required.",
            },
          },
          {
            "@type": "Question",
            name: "Is it stable enough for production CI/CD?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "1,914 tests across 7 packages at 90%+ line coverage. Every write operation supports --dry-run. Semantic exit codes for CI branching.",
            },
          },
        ],
      };
      pageData.frontmatter.head.push([
        "script",
        { type: "application/ld+json" },
        JSON.stringify(faqSchema),
      ]);
    }

    // HowTo schema on tutorial pages
    if (pageData.relativePath === "guide/quick-start.md") {
      const howToSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Get started with GPC — Google Play Console CLI",
        description:
          "Install GPC, authenticate, and run your first Google Play command in 5 minutes.",
        step: [
          { "@type": "HowToStep", name: "Install", text: "npm install -g @gpc-cli/cli" },
          {
            "@type": "HowToStep",
            name: "Authenticate",
            text: "gpc auth login --service-account path/to/key.json",
          },
          { "@type": "HowToStep", name: "Verify", text: "gpc doctor" },
          { "@type": "HowToStep", name: "Check status", text: "gpc status" },
          {
            "@type": "HowToStep",
            name: "Upload",
            text: "gpc releases upload app.aab --track internal",
          },
        ],
      };
      pageData.frontmatter.head.push([
        "script",
        { type: "application/ld+json" },
        JSON.stringify(howToSchema),
      ]);
    }

    // BreadcrumbList schema on all pages
    const parts = canonicalPath.split("/").filter(Boolean);
    if (parts.length > 0) {
      const breadcrumbs = [
        {
          "@type": "ListItem",
          position: 1,
          name: "GPC",
          item: "https://yasserstudio.github.io/gpc/",
        },
        ...parts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: p.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          item: `https://yasserstudio.github.io/gpc/${parts.slice(0, i + 1).join("/")}/`,
        })),
      ];
      pageData.frontmatter.head.push([
        "script",
        { type: "application/ld+json" },
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs,
        }),
      ]);
    }
  },

  sitemap: {
    hostname: "https://yasserstudio.github.io/gpc/",
  },

  themeConfig: {
    logo: "/logo.png",
    siteTitle: "Google Play Console CLI",

    outline: { level: [2, 3], label: "On this page" },
    externalLinkIcon: true,
    darkModeSwitchLabel: "Theme",
    sidebarMenuLabel: "Navigation",
    returnToTopLabel: "Back to top",
    docFooter: { prev: "Previous", next: "Next" },
    lastUpdated: {
      text: "Last updated",
      formatOptions: { dateStyle: "short" },
    },

    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Commands", link: "/commands/" },
      { text: "CI/CD", link: "/ci-cd/" },
      {
        text: "Migration",
        items: [
          { text: "From Fastlane", link: "/migration/from-fastlane" },
          { text: "From Console UI", link: "/migration/from-console-ui" },
          { text: "GPC vs Fastlane", link: "/alternatives/fastlane" },
          { text: "Compare All Tools", link: "/alternatives/" },
          { text: "Release Automation", link: "/alternatives/android-release-automation" },
        ],
      },
      { text: "Advanced", link: "/advanced/architecture" },
      {
        text: "Reference",
        items: [
          {
            text: "Environment Variables",
            link: "/reference/environment-variables",
          },
          { text: "Exit Codes", link: "/reference/exit-codes" },
          { text: "JSON Output Contract", link: "/reference/json-contract" },
          { text: "API Coverage Map", link: "/reference/api-coverage" },
          { text: "API Deprecations", link: "/reference/deprecations" },
          { text: "Changelog", link: "/reference/changelog" },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: si(ICONS.bookOpen, "Getting Started"),
          items: [
            { text: "What is GPC?", link: "/guide/" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quick-start" },
            { text: "Authentication", link: "/guide/authentication" },
            { text: "Configuration", link: "/guide/configuration" },
            { text: "Developer Verification", link: "/guide/developer-verification" },
            { text: "Enterprise Publishing", link: "/guide/enterprise-publishing" },
            { text: "Store Listings & Screenshots", link: "/guide/screenshots" },
            { text: "Multiple Developer Accounts", link: "/guide/multi-account" },
            { text: "FAQ", link: "/guide/faq" },
          ],
        },
      ],

      "/commands/": [
        {
          text: si(ICONS.terminal, "Commands"),
          items: [{ text: "Overview", link: "/commands/" }],
        },
        {
          text: si(ICONS.layers, "Core Workflow"),
          collapsed: false,
          items: [
            { text: "status", link: "/commands/status" },
            { text: "publish / validate", link: "/commands/publish" },
            { text: "releases", link: "/commands/releases" },
            { text: "tracks", link: "/commands/tracks" },
            { text: "listings", link: "/commands/listings" },
          ],
        },
        {
          text: si(ICONS.activity, "Monitoring"),
          collapsed: false,
          items: [
            { text: "reviews", link: "/commands/reviews" },
            { text: "vitals", link: "/commands/vitals" },
            { text: "anomalies", link: "/commands/anomalies" },
          ],
        },
        {
          text: si(ICONS.dollar, "Monetization"),
          collapsed: false,
          items: [
            { text: "subscriptions", link: "/commands/subscriptions" },
            {
              text: "one-time-products",
              link: "/commands/one-time-products",
            },
            { text: "purchase-options", link: "/commands/purchase-options" },
            { text: "iap (legacy)", link: "/commands/iap" },
            { text: "purchases", link: "/commands/purchases" },
            { text: "pricing", link: "/commands/pricing" },
            { text: "rtdn", link: "/commands/rtdn" },
          ],
        },
        {
          text: si(ICONS.users, "Reporting & Team"),
          collapsed: false,
          items: [
            { text: "reports", link: "/commands/reports" },
            { text: "testers", link: "/commands/testers" },
            { text: "users", link: "/commands/users" },
            { text: "grants", link: "/commands/grants" },
          ],
        },
        {
          text: si(ICONS.pkg, "Distribution"),
          collapsed: false,
          items: [
            { text: "bundle", link: "/commands/bundle" },
            { text: "internal-sharing", link: "/commands/internal-sharing" },
            { text: "generated-apks", link: "/commands/generated-apks" },
            { text: "system-apks", link: "/commands/system-apks" },
            { text: "device-tiers", link: "/commands/device-tiers" },
            { text: "enterprise", link: "/commands/enterprise" },
            { text: "games", link: "/commands/games" },
          ],
        },
        {
          text: si(ICONS.shieldCheck, "Compliance & Recovery"),
          collapsed: false,
          items: [
            { text: "preflight", link: "/commands/preflight" },
            { text: "data-safety", link: "/commands/data-safety" },
            { text: "verify", link: "/commands/verify" },
            { text: "recovery", link: "/commands/recovery" },
            {
              text: "external-transactions",
              link: "/commands/external-transactions",
            },
          ],
        },
        {
          text: si(ICONS.cpu, "Automation"),
          collapsed: false,
          items: [
            { text: "train", link: "/commands/train" },
            { text: "quota", link: "/commands/quota" },
          ],
        },
        {
          text: si(ICONS.settings, "System"),
          collapsed: false,
          items: [
            { text: "auth", link: "/commands/auth" },
            { text: "apps", link: "/commands/apps" },
            { text: "config", link: "/commands/config" },
            { text: "plugins", link: "/commands/plugins" },
            { text: "migrate", link: "/commands/migrate" },
            {
              text: "doctor / docs / completion",
              link: "/commands/utility",
            },
            { text: "install-skills", link: "/commands/install-skills" },
            { text: "init", link: "/commands/init" },
            { text: "diff", link: "/commands/diff" },
            { text: "changelog", link: "/commands/changelog" },
          ],
        },
      ],

      "/ci-cd/": [
        {
          text: si(ICONS.gitBranch, "CI/CD Integration"),
          items: [
            { text: "Overview", link: "/ci-cd/" },
            { text: "GitHub Actions", link: "/ci-cd/github-actions" },
            { text: "GitLab CI", link: "/ci-cd/gitlab-ci" },
            { text: "Bitbucket Pipelines", link: "/ci-cd/bitbucket" },
            { text: "CircleCI", link: "/ci-cd/circleci" },
            { text: "Vitals Quality Gates", link: "/ci-cd/vitals-gates" },
          ],
        },
      ],

      "/advanced/": [
        {
          text: si(ICONS.layout, "Architecture"),
          items: [
            { text: "System Design", link: "/advanced/architecture" },
            { text: "Conventions", link: "/advanced/conventions" },
          ],
        },
        {
          text: si(ICONS.plug, "Extend"),
          items: [
            { text: "Plugin Development", link: "/advanced/plugins" },
            { text: "SDK Usage", link: "/advanced/sdk-usage" },
            { text: "Agent Skills", link: "/advanced/skills" },
          ],
        },
        {
          text: si(ICONS.wrench, "Operations"),
          items: [
            { text: "Security", link: "/advanced/security" },
            { text: "Error Codes", link: "/advanced/error-codes" },
            { text: "Troubleshooting", link: "/advanced/troubleshooting" },
          ],
        },
      ],

      "/reference/": [
        {
          text: si(ICONS.book, "Reference"),
          items: [
            {
              text: "Environment Variables",
              link: "/reference/environment-variables",
            },
            { text: "Exit Codes", link: "/reference/exit-codes" },
            {
              text: "JSON Output Contract",
              link: "/reference/json-contract",
            },
            { text: "API Coverage Map", link: "/reference/api-coverage" },
            { text: "API Deprecations", link: "/reference/deprecations" },
            { text: "Changelog", link: "/reference/changelog" },
          ],
        },
      ],

      "/migration/": [
        {
          text: si(ICONS.arrowRight, "Migration"),
          items: [
            { text: "From Fastlane", link: "/migration/from-fastlane" },
            { text: "From Console UI", link: "/migration/from-console-ui" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/yasserstudio/gpc" },
      { icon: "x", link: "https://x.com/yassersstudio" },
    ],

    editLink: {
      pattern: "https://github.com/yasserstudio/gpc/edit/main/apps/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },

    footer: {
      message:
        'Made by <a href="https://yasser.studio" target="_blank"><img src="/gpc/yasser-studio-logo.svg" alt="Yasser\'s Studio" style="display:inline-block;max-height:21px;vertical-align:sub;margin:0 4px"></a> · Free to use. <a href="https://github.com/yasserstudio/gpc" target="_blank" rel="noopener noreferrer">Code on GitHub</a>.',
      copyright: "Not affiliated with Google LLC. Google Play is a trademark of Google LLC.",
    },
  },
});
