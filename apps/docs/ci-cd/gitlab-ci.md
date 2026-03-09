---
outline: deep
---

# GitLab CI

GitLab CI pipeline configurations for releasing Android apps with GPC. Store your service account JSON in GitLab CI/CD variables as `GPC_SERVICE_ACCOUNT` (type: Variable, masked, protected).

## Basic Release Job

Single job that uploads an AAB to the internal track on tag push.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - release

variables:
  GPC_APP: com.example.myapp

build:
  stage: build
  image: eclipse-temurin:17-jdk
  script:
    - ./gradlew bundleRelease
  artifacts:
    paths:
      - app/build/outputs/bundle/release/app-release.aab
    expire_in: 1 day
  only:
    - tags

release:
  stage: release
  image: node:20
  variables:
    GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
  before_script:
    - npm install -g @gpc-cli/cli
  script:
    - |
      gpc releases upload \
        app/build/outputs/bundle/release/app-release.aab \
        --track internal \
        --notes "GitLab CI build ${CI_COMMIT_TAG}" \
        --json
  only:
    - tags
  dependencies:
    - build
```

## Multi-Stage Pipeline

Full pipeline with build, upload, promotion, and vitals monitoring stages. Uses GitLab environments for deployment tracking.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - upload
  - promote
  - monitor

variables:
  GPC_APP: com.example.myapp
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT
  CRASH_THRESHOLD: "2.0"
  ANR_THRESHOLD: "0.5"

.gpc_setup: &gpc_setup
  image: node:20
  before_script:
    - npm install -g @gpc-cli/cli

# -- Build --

build:
  stage: build
  image: eclipse-temurin:17-jdk
  script:
    - ./gradlew bundleRelease
  artifacts:
    paths:
      - app/build/outputs/bundle/release/app-release.aab
    expire_in: 7 days
  only:
    - tags

# -- Upload to Internal --

upload:internal:
  stage: upload
  <<: *gpc_setup
  script:
    - |
      gpc releases upload \
        app/build/outputs/bundle/release/app-release.aab \
        --track internal \
        --notes "Build ${CI_COMMIT_TAG} (pipeline ${CI_PIPELINE_ID})" \
        --json | tee upload-result.json
  artifacts:
    paths:
      - upload-result.json
    expire_in: 7 days
  environment:
    name: internal
  dependencies:
    - build
  only:
    - tags

# -- Promote to Beta --

promote:beta:
  stage: promote
  <<: *gpc_setup
  script:
    - gpc releases promote --from internal --to beta --json
  environment:
    name: beta
  dependencies:
    - upload:internal
  only:
    - tags
  when: manual

# -- Promote to Production (staged) --

promote:production:
  stage: promote
  <<: *gpc_setup
  script:
    - gpc releases promote --from beta --to production --rollout 10 --json
  environment:
    name: production
  dependencies:
    - promote:beta
  only:
    - tags
  when: manual

# -- Vitals Monitoring --

monitor:vitals:
  stage: monitor
  <<: *gpc_setup
  script:
    - |
      CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
      ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')

      echo "Crash rate: ${CRASH_RATE}%"
      echo "ANR rate: ${ANR_RATE}%"

      if (( $(echo "$CRASH_RATE > $CRASH_THRESHOLD" | bc -l) )); then
        echo "Crash rate ${CRASH_RATE}% exceeds threshold ${CRASH_THRESHOLD}%"
        gpc releases rollout halt --track production --json
        exit 1
      fi

      if (( $(echo "$ANR_RATE > $ANR_THRESHOLD" | bc -l) )); then
        echo "ANR rate ${ANR_RATE}% exceeds threshold ${ANR_THRESHOLD}%"
        gpc releases rollout halt --track production --json
        exit 1
      fi

      echo "Vitals healthy"
  only:
    - schedules
```

## Metadata Sync

Sync store listing metadata from the repository to Play Console. Validate on merge request, push on merge to main.

```yaml
# .gitlab-ci.yml (add to existing pipeline or standalone)
stages:
  - validate
  - sync

variables:
  GPC_APP: com.example.myapp
  GPC_SERVICE_ACCOUNT: $GPC_SERVICE_ACCOUNT

validate:metadata:
  stage: validate
  image: node:20
  before_script:
    - npm install -g @gpc-cli/cli
  script:
    - gpc listings push --dir metadata/ --dry-run --json
  only:
    - merge_requests
  changes:
    - metadata/**/*

sync:metadata:
  stage: sync
  image: node:20
  before_script:
    - npm install -g @gpc-cli/cli
  script:
    - gpc listings push --dir metadata/ --json
  only:
    - main
  changes:
    - metadata/**/*
```

## Using GitLab CI/CD Variables

### Setting Up Secrets

1. Navigate to **Settings > CI/CD > Variables**
2. Add `GPC_SERVICE_ACCOUNT` with:
   - **Type:** Variable
   - **Protected:** Yes (only available on protected branches/tags)
   - **Masked:** Yes (hidden in job logs)
   - **Value:** The full JSON content of your service account key

### Per-Environment Variables

Use GitLab environments to scope service accounts:

```yaml
promote:production:
  environment:
    name: production
  variables:
    # Uses a production-specific service account
    GPC_SERVICE_ACCOUNT: $GPC_PROD_SERVICE_ACCOUNT
```

### Scheduled Pipelines

Create a scheduled pipeline for vitals monitoring:

1. Navigate to **Build > Pipeline schedules**
2. Set the cron interval (e.g., `0 */6 * * *` for every 6 hours)
3. Target the `main` branch
4. Add `SCHEDULE_TYPE=vitals` as a pipeline variable

```yaml
monitor:vitals:
  stage: monitor
  <<: *gpc_setup
  script:
    - gpc vitals overview --json
  only:
    - schedules
  variables:
    SCHEDULE_TYPE: vitals
```
