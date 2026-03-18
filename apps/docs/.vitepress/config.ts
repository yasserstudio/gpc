import { defineConfig, type PageData } from "vitepress";

function getPageDescription(page: PageData): string {
  const path = page.relativePath;
  const map: Record<string, string> = {
    "index.md": "The complete CLI for Google Play. 187 API endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",
    "guide/index.md": "Get started with GPC — the complete CLI for Google Play Developer API. Install, authenticate, and ship your first release in minutes.",
    "guide/installation.md": "Install GPC via npm, Homebrew, or standalone binary. No Ruby, no JVM. Works on macOS, Linux, and Windows.",
    "guide/authentication.md": "Authenticate GPC with a service account, OAuth 2.0, or Application Default Credentials. Full setup guide for Play Console.",
    "guide/quick-start.md": "Five minutes to your first release. Authenticate, upload, promote, check vitals, and monitor reviews with GPC.",
    "commands/index.md": "Complete command reference for GPC — the Google Play Console CLI. 30+ commands covering every Play Console operation.",
    "commands/status.md": "gpc status — App health at a glance. Releases, vitals, and reviews in one command. Six parallel API calls in under 3 seconds.",
    "commands/releases.md": "gpc releases — Upload AABs, promote releases, manage staged rollouts, set release notes, and compare tracks.",
    "commands/vitals.md": "gpc vitals — Monitor crash rates, ANR, startup times, rendering, battery, and memory. Set CI threshold gates with --threshold.",
    "commands/reviews.md": "gpc reviews — List, filter, reply to, and export user reviews. Filter by stars, language, date.",
    "commands/listings.md": "gpc listings — Manage store metadata, screenshots, and localizations. Fastlane supply compatible.",
    "commands/publish.md": "gpc publish — End-to-end release in one command. Upload, assign track, and commit. Use gpc validate for dry-run.",
    "commands/subscriptions.md": "gpc subscriptions — Manage subscriptions, base plans, and offers using the modern Google Play monetization API.",
    "ci-cd/index.md": "Integrate GPC into GitHub Actions, GitLab CI, Bitbucket Pipelines, and CircleCI. Semantic exit codes, JSON output, vitals gates.",
    "ci-cd/github-actions.md": "Use GPC in GitHub Actions to automate Google Play releases, vitals monitoring, and metadata sync.",
    "migration/from-fastlane.md": "Migrate from Fastlane supply to GPC. Command mapping, metadata migration, and CI workflow examples.",
    "reference/environment-variables.md": "All GPC_* environment variables — authentication, output, network, debugging, and proxy configuration.",
    "reference/exit-codes.md": "GPC semantic exit codes: 0 success, 2 usage, 3 auth, 4 API, 5 network, 6 vitals threshold breach. CI scripting patterns.",
    "reference/changelog.md": "GPC changelog — all notable changes across every release.",
    "advanced/architecture.md": "GPC system design, package architecture, and dependency graph.",
    "advanced/security.md": "GPC security model — credential handling, secrets redaction, audit logging, and threat model.",
    "advanced/plugins.md": "Build GPC plugins with lifecycle hooks and custom commands using the @gpc-cli/plugin-sdk.",
    "advanced/sdk-usage.md": "Use @gpc-cli/api and @gpc-cli/auth as a standalone TypeScript SDK for the Google Play Developer API.",
  };
  return map[path] ?? `GPC documentation — ${page.title ?? "Google Play Console CLI"}`;
}

export default defineConfig({
  title: "GPC — Google Play Console CLI",
  description:
    "The complete CLI for Google Play. 187 API endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",

  base: "/gpc/",

  markdown: {
    theme: {
      light: "github-light",
      dark:  "github-dark-dimmed",
    },
  },

  head: [
    ["link", { rel: "icon", href: "/gpc/favicon.ico" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "dns-prefetch", href: "https://fonts.gstatic.com" }],
    [
      "meta",
      { property: "og:title", content: "GPC — Google Play Console CLI" },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "The complete CLI for Google Play. 187 API endpoints, one tool. No Ruby, no browser, no ceremony.",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    [
      "meta",
      { property: "og:url", content: "https://yasserstudio.github.io/gpc/" },
    ],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "GPC — Google Play Console CLI",
        "description": "The complete CLI for Google Play Developer API. 187 endpoints, one tool. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "macOS, Linux, Windows",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "url": "https://yasserstudio.github.io/gpc/",
        "downloadUrl": "https://www.npmjs.com/package/@gpc-cli/cli",
        "installUrl": "https://www.npmjs.com/package/@gpc-cli/cli",
        "codeRepository": "https://github.com/yasserstudio/gpc",
        "license": "https://opensource.org/licenses/MIT",
        "programmingLanguage": "TypeScript",
        "softwareVersion": "0.9.34",
        "releaseNotes": "https://yasserstudio.github.io/gpc/reference/changelog",
        "documentation": "https://yasserstudio.github.io/gpc/",
        "author": { "@type": "Person", "name": "yasserstudio", "url": "https://github.com/yasserstudio" },
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
      ["meta", { property: "og:image", content: "https://yasserstudio.github.io/gpc/og-image.png" }],
      ["meta", { name: "twitter:image", content: "https://yasserstudio.github.io/gpc/og-image.png" }],
    );
  },

  sitemap: {
    hostname: "https://yasserstudio.github.io/gpc/",
  },

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "GPC",

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
      { text: "Roadmap", link: "/roadmap" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
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
          text: "Commands",
          items: [{ text: "Overview", link: "/commands/" }],
        },
        {
          text: "Core Workflow",
          items: [
            { text: "status", link: "/commands/status" },
            { text: "publish / validate", link: "/commands/publish" },
            { text: "releases", link: "/commands/releases" },
            { text: "tracks", link: "/commands/tracks" },
            { text: "listings", link: "/commands/listings" },
          ],
        },
        {
          text: "Monitoring",
          items: [
            { text: "reviews", link: "/commands/reviews" },
            { text: "vitals", link: "/commands/vitals" },
            { text: "anomalies", link: "/commands/anomalies" },
          ],
        },
        {
          text: "Monetization",
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
          text: "Reporting & Team",
          items: [
            { text: "reports", link: "/commands/reports" },
            { text: "testers", link: "/commands/testers" },
            { text: "users", link: "/commands/users" },
          ],
        },
        {
          text: "Distribution",
          items: [
            { text: "bundle", link: "/commands/bundle" },
            { text: "internal-sharing", link: "/commands/internal-sharing" },
            { text: "generated-apks", link: "/commands/generated-apks" },
            { text: "device-tiers", link: "/commands/device-tiers" },
          ],
        },
        {
          text: "Compliance & Recovery",
          items: [
            { text: "data-safety", link: "/commands/data-safety" },
            { text: "recovery", link: "/commands/recovery" },
            {
              text: "external-transactions",
              link: "/commands/external-transactions",
            },
          ],
        },
        {
          text: "System",
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
          text: "CI/CD Integration",
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
          text: "Architecture",
          items: [
            { text: "System Design", link: "/advanced/architecture" },
            { text: "Plugin Development", link: "/advanced/plugins" },
            { text: "SDK Usage", link: "/advanced/sdk-usage" },
            { text: "Agent Skills", link: "/advanced/skills" },
          ],
        },
        {
          text: "Operations",
          items: [
            { text: "Security", link: "/advanced/security" },
            { text: "Error Codes", link: "/advanced/error-codes" },
            { text: "Troubleshooting", link: "/advanced/troubleshooting" },
          ],
        },
        {
          text: "Migration",
          items: [
            { text: "From Fastlane", link: "/migration/from-fastlane" },
            { text: "From Console UI", link: "/migration/from-console-ui" },
          ],
        },
        {
          text: "Project",
          items: [
            { text: "Conventions", link: "/advanced/conventions" },
          ],
        },
      ],

      "/reference/": [
        {
          text: "Reference",
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
          text: "Migration",
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
      pattern:
        "https://github.com/yasserstudio/gpc/edit/main/apps/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright:
        "Not affiliated with Google LLC. Google Play is a trademark of Google LLC.",
    },
  },
});
