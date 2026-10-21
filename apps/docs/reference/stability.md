---
outline: deep
---

# Versioning and Stability

From v1.0.0, GPC follows [semantic versioning](https://semver.org/). This page lists what that promise covers, so you know what can change under a pinned CI pipeline and what cannot.

## What a version number tells you

| Release | Example        | What it can contain                                      |
| ------- | -------------- | -------------------------------------------------------- |
| Patch   | 1.0.0 -> 1.0.1 | Bug fixes and security fixes. No new commands or flags.  |
| Minor   | 1.0.0 -> 1.1.0 | New commands, flags, output fields and preflight checks. |
| Major   | 1.x -> 2.0.0   | Breaking changes, each one listed in the changelog.      |

The `gpc` version is the version of `@gpc-cli/cli`. That is the number `gpc --version`, the GitHub Releases page and the GPC Action refer to.

## What is stable

Within a major version, these do not change in a breaking way:

- **Commands and flags.** Every documented command, subcommand and flag keeps its name and meaning. Docs examples are checked against the real command tree on every test run.
- **Exit codes.** The meanings in [Exit Codes](/reference/exit-codes) stay fixed, so `if` branches in your CI keep working.
- **`--json` output.** Field names and shapes in the [JSON Output Contract](/reference/json-contract), including the list envelope `{ <key>, nextPageToken, meta.count }`. New fields can be added in a minor release; existing ones are not renamed or removed.
- **Error codes.** Codes such as `THRESHOLD_INVALID` or `API_APP_NOT_FOUND` keep their names, so scripts can match on them. The message and suggestion text can be improved at any time.
- **Configuration.** `.gpcrc.json` and user config keys, profiles, and the `GPC_*` [environment variables](/reference/environment-variables).
- **`@gpc-cli/api`.** The typed API client is at 1.x and follows the same rules for its public exports.

## What is not covered

- **Human-readable output.** Table layouts, column order, colours and wording can change in any release. Parse `--json`, not the table.
- **Packages still at 0.x.** `@gpc-cli/core`, `@gpc-cli/auth`, `@gpc-cli/config`, `@gpc-cli/plugin-sdk` and `@gpc-cli/plugin-ci` are building blocks of the CLI. Under semver, a 0.x minor release may break them. They join this promise when they reach 1.0.
- **Google's own changes.** When Google retires an API or changes what it returns, GPC follows. Known shutdowns are tracked on [API Deprecations](/reference/deprecations).
- **Hidden commands**, such as the shell-completion helper, which are not part of the documented interface.

## Fixes that change results

A bug fix can change what a command does when the old behaviour was wrong. For example, a vitals gate that never fired will start failing builds once it is fixed. Fixes like this ship in patch or minor releases, because the documented behaviour did not change. The changelog marks them clearly so you can check a pipeline before upgrading.

Security fixes follow the same rule: if a default is unsafe, it is fixed in the next release, even when that stops something that used to work.

## Deprecations

When a command, flag, output field or config key is going away:

1. It is marked deprecated in a minor release, in the docs and the changelog.
2. Using it prints a warning on stderr that names the replacement. `--json` output on stdout stays clean.
3. It keeps working until the next major release, and is only removed there.

## Runtime support

The npm package needs Node.js 20 or newer. Dropping a Node.js version is a breaking change and waits for a major release, unless that version has reached end of life upstream. The standalone binary and Homebrew install need no Node.js at all.

## Pinning in CI

For predictable pipelines, pin an exact version and upgrade on purpose:

```bash
npm install -g @gpc-cli/cli@1.0.0
```

With the GPC Action, set `gpc-version`. Read the [changelog](/reference/changelog) before moving to a new minor or major version.
