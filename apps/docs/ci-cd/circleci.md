---
outline: deep
---

# CircleCI

CircleCI configuration for releasing Android apps with GPC. Store your service account JSON as a project environment variable or in a context.

## Setup

### Environment Variables

1. Navigate to **Project Settings > Environment Variables**
2. Add `GPC_SERVICE_ACCOUNT` with the full service account JSON content
3. Add `GPC_APP` with your package name

### Using Contexts

For shared credentials across projects, create a context:

1. Navigate to **Organization Settings > Contexts**
2. Create a context named `gpc-credentials`
3. Add `GPC_SERVICE_ACCOUNT` and `GPC_APP` variables

Reference the context in your workflow:

```yaml
workflows:
  release:
    jobs:
      - upload:
          context: gpc-credentials
```

## Basic Release Job

Uploads an AAB to the internal track on tag push.

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    docker:
      - image: cimg/android:2024.07
    steps:
      - checkout
      - run:
          name: Build release AAB
          command: ./gradlew bundleRelease
      - persist_to_workspace:
          root: .
          paths:
            - app/build/outputs/bundle/release/app-release.aab

  upload:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli
      - run:
          name: Upload to Play Store
          command: |
            gpc releases upload \
              app/build/outputs/bundle/release/app-release.aab \
              --track internal \
              --notes "CircleCI build ${CIRCLE_TAG}" \
              --json

workflows:
  release:
    jobs:
      - build:
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
      - upload:
          requires:
            - build
          context: gpc-credentials
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
```

## Full Pipeline with Promotion

Multi-stage pipeline with manual approval gates for beta and production promotion.

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    docker:
      - image: cimg/android:2024.07
    steps:
      - checkout
      - run:
          name: Build release AAB
          command: ./gradlew bundleRelease
      - persist_to_workspace:
          root: .
          paths:
            - app/build/outputs/bundle/release/app-release.aab

  upload:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli
      - run:
          name: Upload to internal track
          command: |
            gpc releases upload \
              app/build/outputs/bundle/release/app-release.aab \
              --track internal \
              --notes "Build ${CIRCLE_TAG}" \
              --json

  promote-beta:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli
      - run:
          name: Promote to beta
          command: gpc releases promote --from internal --to beta --json

  promote-production:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli
      - run:
          name: Check vitals before promotion
          command: |
            gpc vitals crashes --threshold 2.0 --json
            gpc vitals anr --threshold 0.5 --json
      - run:
          name: Promote to production (staged)
          command: |
            gpc releases promote \
              --from beta \
              --to production \
              --rollout 10 \
              --json

  vitals-check:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli
      - run:
          name: Check vitals
          command: |
            CRASH_RATE=$(gpc vitals crashes --json | jq -r '.data.crashRate')
            ANR_RATE=$(gpc vitals anr --json | jq -r '.data.anrRate')

            echo "Crash rate: ${CRASH_RATE}%"
            echo "ANR rate: ${ANR_RATE}%"

            if (( $(echo "$CRASH_RATE > 2.0" | bc -l) )); then
              echo "Crash rate too high, halting rollout"
              gpc releases rollout halt --track production --json
              exit 1
            fi

            echo "Vitals healthy"

workflows:
  release:
    jobs:
      - build:
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
      - upload:
          requires:
            - build
          context: gpc-credentials
          filters:
            tags:
              only: /^v.*/
      - hold-beta:
          type: approval
          requires:
            - upload
          filters:
            tags:
              only: /^v.*/
      - promote-beta:
          requires:
            - hold-beta
          context: gpc-credentials
          filters:
            tags:
              only: /^v.*/
      - hold-production:
          type: approval
          requires:
            - promote-beta
          filters:
            tags:
              only: /^v.*/
      - promote-production:
          requires:
            - hold-production
          context: gpc-credentials
          filters:
            tags:
              only: /^v.*/

  # Scheduled vitals monitoring
  nightly-vitals:
    triggers:
      - schedule:
          cron: "0 10 * * *"
          filters:
            branches:
              only:
                - main
    jobs:
      - vitals-check:
          context: gpc-credentials
```

## Reusable Commands

Define reusable commands to keep your config DRY.

```yaml
# .circleci/config.yml
version: 2.1

commands:
  install-gpc:
    description: Install GPC CLI
    steps:
      - run:
          name: Install GPC
          command: npm install -g @gpc-cli/cli

  gpc-upload:
    description: Upload AAB to a track
    parameters:
      file:
        type: string
      track:
        type: string
        default: internal
      notes:
        type: string
        default: ""
    steps:
      - install-gpc
      - run:
          name: Upload to << parameters.track >>
          command: |
            gpc releases upload "<< parameters.file >>" \
              --track "<< parameters.track >>" \
              --notes "<< parameters.notes >>" \
              --json

  gpc-promote:
    description: Promote between tracks
    parameters:
      from:
        type: string
      to:
        type: string
      rollout:
        type: integer
        default: 0
    steps:
      - install-gpc
      - run:
          name: Promote from << parameters.from >> to << parameters.to >>
          command: |
            ROLLOUT_FLAG=""
            if [ "<< parameters.rollout >>" -gt 0 ]; then
              ROLLOUT_FLAG="--rollout << parameters.rollout >>"
            fi
            gpc releases promote \
              --from "<< parameters.from >>" \
              --to "<< parameters.to >>" \
              $ROLLOUT_FLAG \
              --json
```

Use the commands in jobs:

```yaml
jobs:
  release:
    docker:
      - image: cimg/node:20.0
    environment:
      GPC_APP: com.example.myapp
    steps:
      - attach_workspace:
          at: .
      - gpc-upload:
          file: app/build/outputs/bundle/release/app-release.aab
          track: internal
          notes: "Build ${CIRCLE_TAG}"
```
