# GPC - Google Play Console CLI

## Vision

A comprehensive, enterprise-grade command-line interface for the Google Play Developer API. The modern, well-maintained alternative to fragmented tooling — built for developers, CI/CD pipelines, and platform teams managing Android app distribution at scale.

## Problem Statement

- **Fastlane `supply`** is Ruby-based, heavyweight, and tightly coupled to the Fastlane ecosystem
- **Existing CLIs** (`play-console-cli`, etc.) are minimal, unmaintained, and cover only a fraction of the API
- **Google's own tooling** requires manual Console interaction or raw API calls
- **No unified CLI** covers the full Google Play Developer API surface with first-class DX

## Goals

1. **Complete API coverage** — Every Google Play Developer API v3 endpoint, accessible from the terminal
2. **Enterprise-ready** — Multi-account support, service account auth, audit logging, structured output
3. **CI/CD native** — JSON output, exit codes, non-interactive mode, environment variable config
4. **Extensible** — Plugin architecture for custom workflows and third-party integrations
5. **Cross-platform** — macOS, Linux, Windows via npm or standalone binary

## Non-Goals (v1)

- GUI or web dashboard (future consideration)
- App building or signing (use Gradle/AGP for that)
- Firebase integration (separate tool)

## Target Users

| Persona | Use Case |
|---------|----------|
| **Solo developer** | Manage releases, respond to reviews, check vitals from terminal |
| **Platform/Release team** | Automate multi-app release trains, staged rollouts, metadata sync |
| **CI/CD pipeline** | Upload bundles, promote tracks, validate submissions in automation |
| **DevOps/SRE** | Monitor vitals, crash rates, ANRs; trigger alerts |
| **Product manager** | Pull reports, review analytics, manage pricing |

## Competitive Landscape

| Tool | Language | Maintained | API Coverage | CI/CD Ready |
|------|----------|------------|--------------|-------------|
| Fastlane `supply` | Ruby | Yes | Partial | Yes |
| `play-console-cli` | Node | No | Minimal | No |
| **GPC (this project)** | **TypeScript** | **Yes** | **Full** | **Yes** |

## Success Metrics

- Full Google Play Developer API v3 coverage
- <500ms cold start for simple commands
- 90%+ test coverage on core packages
- Published to npm with `npx gpc` support
- Adopted by at least 1 major open-source Android project's CI
