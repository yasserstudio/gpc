# @gpc-cli/plugin-ci

CI/CD helpers for GPC. Auto-detects CI environments and writes GitHub Actions step summaries.

## Install

```bash
npm install @gpc-cli/plugin-ci
```

## Setup

Add to your `.gpcrc.json`:

```json
{
  "plugins": ["@gpc-cli/plugin-ci"]
}
```

The plugin activates automatically when running in a CI environment.

## What It Does

- **Detects CI provider** — GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitrise
- **Writes step summaries** — Markdown tables in `$GITHUB_STEP_SUMMARY` after each command
- **Reports errors** — Structured error output in step summaries when commands fail

## Usage in GitHub Actions

```yaml
- name: Install GPC
  run: npm install -g @gpc-cli/cli @gpc-cli/plugin-ci

- name: Upload Release
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: gpc releases upload app.aab --track internal
  # Step summary is written automatically
```

## Programmatic Usage

```typescript
import { detectCIEnvironment, writeStepSummary } from "@gpc-cli/plugin-ci";

const ci = detectCIEnvironment();

if (ci.isCI) {
  console.log(`Running in ${ci.provider}`);
  console.log(`Branch: ${ci.branch}`);
  console.log(`Commit: ${ci.commitSha}`);
}

if (ci.hasStepSummary) {
  writeStepSummary("| Command | Status |\n|---------|--------|\n| upload | ok |");
}
```

## CI Detection

| Provider | Detected By |
|----------|-------------|
| GitHub Actions | `GITHUB_ACTIONS` |
| GitLab CI | `GITLAB_CI` |
| Jenkins | `JENKINS_URL` |
| CircleCI | `CIRCLECI` |
| Bitrise | `BITRISE_IO` |
| Generic CI | `CI` |

## Part of the GPC Monorepo

This is the first-party CI plugin for [GPC](https://github.com/yasserstudio/gpc). See the [CI/CD Guide](https://yasserstudio.github.io/gpc/ci-cd/) for pipeline recipes.

## License

MIT
