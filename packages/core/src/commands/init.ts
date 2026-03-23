// Named exports only. No default export.

import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

export interface InitOptions {
  dir: string;
  app?: string;
  ci?: "github" | "gitlab";
  skipExisting?: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function safeWrite(
  filePath: string,
  content: string,
  created: string[],
  skipped: string[],
  skipExisting: boolean,
): Promise<void> {
  if (await exists(filePath)) {
    if (skipExisting) {
      skipped.push(filePath);
      return;
    }
  }
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, "utf-8");
  created.push(filePath);
}

export async function initProject(options: InitOptions): Promise<InitResult> {
  const { dir, app, ci } = options;
  const skipExisting = options.skipExisting !== false;
  const created: string[] = [];
  const skipped: string[] = [];
  const pkg = app || "com.example.app";

  // .gpcrc.json
  const gpcrc = JSON.stringify(
    {
      app: pkg,
      output: "table",
    },
    null,
    2,
  );
  await safeWrite(join(dir, ".gpcrc.json"), gpcrc + "\n", created, skipped, skipExisting);

  // .preflightrc.json
  const preflightrc = JSON.stringify(
    {
      failOn: "error",
      targetSdkMinimum: 35,
      maxDownloadSizeMb: 150,
      allowedPermissions: [],
      disabledRules: [],
      severityOverrides: {},
    },
    null,
    2,
  );
  await safeWrite(join(dir, ".preflightrc.json"), preflightrc + "\n", created, skipped, skipExisting);

  // metadata/android/en-US/ listing files
  const metaDir = join(dir, "metadata", "android", "en-US");
  await safeWrite(join(metaDir, "title.txt"), "", created, skipped, skipExisting);
  await safeWrite(join(metaDir, "short_description.txt"), "", created, skipped, skipExisting);
  await safeWrite(join(metaDir, "full_description.txt"), "", created, skipped, skipExisting);
  await safeWrite(join(metaDir, "video.txt"), "", created, skipped, skipExisting);

  // metadata/android/en-US/images/phoneScreenshots/
  const ssDir = join(metaDir, "images", "phoneScreenshots");
  await mkdir(ssDir, { recursive: true });
  await safeWrite(join(ssDir, ".gitkeep"), "", created, skipped, skipExisting);

  // CI templates
  if (ci === "github") {
    const workflow = githubActionsTemplate(pkg);
    const workflowDir = join(dir, ".github", "workflows");
    await safeWrite(join(workflowDir, "gpc-release.yml"), workflow, created, skipped, skipExisting);
  } else if (ci === "gitlab") {
    const pipeline = gitlabCiTemplate(pkg);
    await safeWrite(join(dir, ".gitlab-ci-gpc.yml"), pipeline, created, skipped, skipExisting);
  }

  return { created, skipped };
}

function githubActionsTemplate(pkg: string): string {
  return `name: GPC Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    env:
      GPC_SERVICE_ACCOUNT: \${{ secrets.GPC_SERVICE_ACCOUNT }}
      GPC_APP: ${pkg}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build
        run: ./gradlew bundleRelease

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Preflight compliance check
        run: gpc preflight app/build/outputs/bundle/release/app-release.aab --fail-on error

      - name: Upload to internal track
        run: |
          gpc releases upload app/build/outputs/bundle/release/app-release.aab \\
            --track internal \\
            --json
`;
}

function gitlabCiTemplate(pkg: string): string {
  return `# GPC Release Pipeline
# Add GPC_SERVICE_ACCOUNT as a CI/CD variable (masked, protected)

stages:
  - build
  - preflight
  - release

variables:
  GPC_APP: ${pkg}

build:
  stage: build
  image: gradle:jdk17
  script:
    - ./gradlew bundleRelease
  artifacts:
    paths:
      - app/build/outputs/bundle/release/app-release.aab

preflight:
  stage: preflight
  image: node:20
  script:
    - npm install -g @gpc-cli/cli
    - gpc preflight app/build/outputs/bundle/release/app-release.aab --fail-on error --json

release:
  stage: release
  image: node:20
  script:
    - npm install -g @gpc-cli/cli
    - gpc releases upload app/build/outputs/bundle/release/app-release.aab --track internal
  only:
    - tags
`;
}
