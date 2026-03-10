import { defineConfig } from "vitepress";

export default defineConfig({
  title: "GPC",
  description: "The complete CLI for Google Play — 162 API endpoints, one tool.",

  base: "/gpc/",

  head: [
    ["link", { rel: "icon", href: "/gpc/favicon.ico" }],
    ["meta", { property: "og:title", content: "GPC — Google Play CLI" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Ship Android apps from your terminal. Releases, rollouts, metadata, vitals, reviews, subscriptions, reports, and more.",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],

  lastUpdated: true,

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
      { text: "Advanced", link: "/advanced/architecture" },
      {
        text: "Reference",
        items: [
          { text: "Environment Variables", link: "/reference/environment-variables" },
          { text: "Exit Codes", link: "/reference/exit-codes" },
          { text: "JSON Output Contract", link: "/reference/json-contract" },
          { text: "API Coverage Map", link: "/reference/api-coverage" },
        ],
      },
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
            { text: "publish / validate / status", link: "/commands/publish" },
            { text: "releases", link: "/commands/releases" },
            { text: "listings", link: "/commands/listings" },
          ],
        },
        {
          text: "Monitoring",
          items: [
            { text: "reviews", link: "/commands/reviews" },
            { text: "vitals", link: "/commands/vitals" },
          ],
        },
        {
          text: "Monetization",
          items: [
            { text: "subscriptions", link: "/commands/subscriptions" },
            { text: "iap", link: "/commands/iap" },
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
          text: "System",
          items: [
            { text: "auth", link: "/commands/auth" },
            { text: "apps", link: "/commands/apps" },
            { text: "config", link: "/commands/config" },
            { text: "plugins", link: "/commands/plugins" },
            { text: "doctor / docs / completion", link: "/commands/utility" },
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
          ],
        },
        {
          text: "Operations",
          items: [
            { text: "Security", link: "/advanced/security" },
            { text: "Error Codes", link: "/advanced/error-codes" },
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
            { text: "Roadmap", link: "/roadmap" },
          ],
        },
      ],

      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Environment Variables", link: "/reference/environment-variables" },
            { text: "Exit Codes", link: "/reference/exit-codes" },
            { text: "JSON Output Contract", link: "/reference/json-contract" },
            { text: "API Coverage Map", link: "/reference/api-coverage" },
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
