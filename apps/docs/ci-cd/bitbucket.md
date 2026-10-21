---
outline: deep
---

# Bitbucket Pipelines

Bitbucket Pipelines configuration for releasing Android apps with GPC. Store your service account JSON as a repository variable named `GPC_SERVICE_ACCOUNT` (secured).

## Setup

1. Navigate to **Repository settings > Pipelines > Repository variables**
2. Add `GPC_SERVICE_ACCOUNT` with the full service account JSON content
3. Check **Secured** to mask the value in logs
4. Add `GPC_APP` with your package name (not secured)

## Tag-Triggered Release

Uploads the AAB to the internal track when a version tag is pushed.

```yaml
# bitbucket-pipelines.yml
image: eclipse-temurin:17-jdk

definitions:
  steps:
    - step: &build
        name: Build AAB
        script:
          - ./gradlew bundleRelease
        artifacts:
          - app/build/outputs/bundle/release/app-release.aab

    - step: &upload
        name: Upload to Play Store
        image: node:20
        script:
          - npm install -g @gpc-cli/cli
          - |
            gpc releases upload \
              app/build/outputs/bundle/release/app-release.aab \
              --track internal \
              --notes "Build ${BITBUCKET_TAG}" \
              --json

pipelines:
  tags:
    "v*":
      - step: *build
      - step:
          <<: *upload
          deployment: staging
```

## Full Pipeline with Promotion

Build, upload to internal, then manually promote to beta or production.

```yaml
# bitbucket-pipelines.yml
image: eclipse-temurin:17-jdk

definitions:
  steps:
    - step: &build
        name: Build AAB
        script:
          - ./gradlew bundleRelease
        artifacts:
          - app/build/outputs/bundle/release/app-release.aab

    - step: &gpc-upload
        name: Upload to Internal
        image: node:20
        script:
          - npm install -g @gpc-cli/cli
          - |
            gpc releases upload \
              app/build/outputs/bundle/release/app-release.aab \
              --track internal \
              --notes "Build ${BITBUCKET_TAG}" \
              --json

    - step: &promote-beta
        name: Promote to Beta
        image: node:20
        trigger: manual
        script:
          - npm install -g @gpc-cli/cli
          - gpc releases promote --from internal --to beta --json

    - step: &promote-production
        name: Promote to Production
        image: node:20
        trigger: manual
        script:
          - npm install -g @gpc-cli/cli
          - |
            gpc releases promote \
              --from beta \
              --to production \
              --rollout 10 \
              --json

pipelines:
  tags:
    "v*":
      - step: *build
      - step:
          <<: *gpc-upload
          deployment: staging
      - step:
          <<: *promote-beta
          deployment: test
      - step:
          <<: *promote-production
          deployment: production
```

## Metadata Sync on Pull Request

Validate metadata changes with `--dry-run` on pull requests. Push metadata on merge to main.

```yaml
# bitbucket-pipelines.yml (add to existing)
pipelines:
  pull-requests:
    "**":
      - step:
          name: Validate Metadata
          image: node:20
          script:
            - npm install -g @gpc-cli/cli
            - gpc listings push --dir metadata/ --dry-run --json
          condition:
            changesets:
              includePaths:
                - "metadata/**"

  branches:
    main:
      - step:
          name: Sync Metadata
          image: node:20
          script:
            - npm install -g @gpc-cli/cli
            - gpc listings push --dir metadata/ --json
          condition:
            changesets:
              includePaths:
                - "metadata/**"
```

## Vitals Check (Scheduled)

Set up a scheduled pipeline in Bitbucket (Repository settings > Pipelines > Schedules) to run vitals checks.

```yaml
# bitbucket-pipelines.yml (add custom pipeline)
pipelines:
  custom:
    vitals-check:
      - step:
          name: Check Vitals
          image: node:20
          script:
            - npm install -g @gpc-cli/cli
            - |
              # gpc status reports each metric as a fraction under .vitals.<metric>.value
              # status exits 6 on a breach but still prints the JSON
              STATUS_JSON=$(gpc status --json || true)
              CRASH_RATE=$(echo "$STATUS_JSON" | jq -r '.vitals.crashes.value // "unknown"')
              ANR_RATE=$(echo "$STATUS_JSON" | jq -r '.vitals.anr.value // "unknown"')

              echo "Crash rate: ${CRASH_RATE}"
              echo "ANR rate: ${ANR_RATE}"

              # --threshold is the built-in gate (fractions: 0.02 is 2%), exit 6 on breach
              if ! gpc vitals crashes --threshold 0.02 --json > /dev/null; then
                echo "Crash rate exceeds threshold"
                exit 1
              fi

              if ! gpc vitals anr --threshold 0.005 --json > /dev/null; then
                echo "ANR rate exceeds threshold"
                exit 1
              fi

              echo "All vitals healthy"
```

## Deployment Environments

Bitbucket deployments map naturally to Play Store tracks:

| Bitbucket Environment | Play Store Track | Trigger          |
| --------------------- | ---------------- | ---------------- |
| `staging`             | `internal`       | Automatic on tag |
| `test`                | `beta`           | Manual           |
| `production`          | `production`     | Manual           |

Configure environments in **Repository settings > Deployments** to require manual approval for production deployments and to track deployment history.
