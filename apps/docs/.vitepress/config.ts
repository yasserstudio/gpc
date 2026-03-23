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
      "The complete CLI for Google Play. 187 API endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",
    "guide/index.md":
      "Get started with GPC — the complete CLI for Google Play Developer API. Install, authenticate, and ship your first release in minutes.",
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
      "gpc releases — Upload AABs, promote releases, manage staged rollouts, set release notes, and compare tracks.",
    "commands/vitals.md":
      "gpc vitals — Monitor crash rates, ANR, startup times, rendering, battery, and memory. Set CI threshold gates with --threshold.",
    "commands/reviews.md":
      "gpc reviews — List, filter, reply to, and export user reviews. Filter by stars, language, date.",
    "commands/listings.md":
      "gpc listings — Manage store metadata, screenshots, and localizations. Fastlane supply compatible.",
    "commands/publish.md":
      "gpc publish — End-to-end release in one command. Upload, assign track, and commit. Use gpc validate for dry-run.",
    "commands/subscriptions.md":
      "gpc subscriptions — Manage subscriptions, base plans, and offers using the modern Google Play monetization API.",
    "ci-cd/index.md":
      "Integrate GPC into GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI. Semantic exit codes, JSON output, vitals gates.",
    "ci-cd/github-actions.md":
      "Use GPC in GitHub Actions to automate Google Play releases, vitals monitoring, and metadata sync.",
    "migration/from-fastlane.md":
      "Migrate from Fastlane supply to GPC. Command mapping, metadata migration, and CI workflow examples.",
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
      "Use @gpc-cli/api and @gpc-cli/auth as a standalone TypeScript SDK for the Google Play Developer API.",
    "roadmap.md":
      "GPC roadmap — v1.0.0 stable release, gpc preflight compliance scanner, and future plans for the Google Play Console CLI.",
    "commands/preflight.md":
      "gpc preflight — Scan your AAB against Google Play policies before submission. Offline, free, CI-ready. The missing compliance tool for Android.",
  };
  return map[path] ?? `GPC documentation — ${page.title ?? "Google Play Console CLI"}`;
}

export default defineConfig({
  title: "GPC — Google Play Console CLI",
  description:
    "The complete CLI for Google Play. 187 API endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",

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
    ["link", { rel: "icon", href: "/gpc/favicon.ico" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.gstatic.com" }],
    ["meta", { property: "og:title", content: "GPC — Google Play Console CLI" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "The complete CLI for Google Play. 187 API endpoints, one tool. No Ruby, no browser, no ceremony.",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:url", content: "https://yasserstudio.github.io/gpc/" }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "GPC — Google Play Console CLI",
        description:
          "The complete CLI for Google Play Developer API. 187 endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "macOS, Linux, Windows",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        url: "https://yasserstudio.github.io/gpc/",
        downloadUrl: "https://www.npmjs.com/package/@gpc-cli/cli",
        installUrl: "https://www.npmjs.com/package/@gpc-cli/cli",
        codeRepository: "https://github.com/yasserstudio/gpc",
        license: "https://opensource.org/licenses/MIT",
        programmingLanguage: "TypeScript",
        softwareVersion: "0.9.38",
        releaseNotes: "https://yasserstudio.github.io/gpc/reference/changelog",
        documentation: "https://yasserstudio.github.io/gpc/",
        author: { "@type": "Person", name: "yasserstudio", url: "https://github.com/yasserstudio" },
      }),
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "meta",
      {
        name: "twitter:title",
        content: "GPC — Google Play Console CLI",
      },
    ],
    [
      "meta",
      {
        name: "twitter:description",
        content:
          "The complete CLI for Google Play. 187 API endpoints, one tool. No Ruby, no browser, no ceremony.",
      },
    ],
    [
      "meta",
      {
        name: "keywords",
        content:
          "google play cli, google play developer api, android release automation, fastlane alternative, play store cli, upload aab command line, google play vitals, android ci cd",
      },
    ],
  ],

  lastUpdated: true,

  transformPageData(pageData) {
    const desc = getPageDescription(pageData);
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ["meta", { name: "description", content: desc }],
      ["meta", { property: "og:description", content: desc }],
      ["meta", { name: "twitter:description", content: desc }],
      [
        "meta",
        { property: "og:image", content: "https://yasserstudio.github.io/gpc/og-image.png" },
      ],
      [
        "meta",
        { name: "twitter:image", content: "https://yasserstudio.github.io/gpc/og-image.png" },
      ],
    );
  },

  sitemap: {
    hostname: "https://yasserstudio.github.io/gpc/",
  },

  themeConfig: {
    logo: "/logo.svg",
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
        ],
      },
      { text: "Advanced", link: "/advanced/architecture" },
      { text: "Roadmap", link: "/roadmap" },
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
      { icon: "x", link: "https://x.com/yasserstudio" },
    ],

    editLink: {
      pattern: "https://github.com/yasserstudio/gpc/edit/main/apps/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Not affiliated with Google LLC. Google Play is a trademark of Google LLC.",
    },
  },
});
