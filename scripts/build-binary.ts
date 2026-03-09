#!/usr/bin/env node

/**
 * Build standalone GPC binary using esbuild (bundle) + Bun (compile).
 *
 * Usage:
 *   npx tsx scripts/build-binary.ts                    # Current platform only
 *   npx tsx scripts/build-binary.ts --target linux-x64 # Specific target
 *   npx tsx scripts/build-binary.ts --all              # All platforms
 *   npx tsx scripts/build-binary.ts --bundle-only      # Bundle only, no compile
 */

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist", "bin");
const BUNDLE_PATH = join(ROOT, "dist", "gpc-bundled.mjs");
const META_PATH = join(ROOT, "dist", "gpc-bundle-meta.json");

interface Target {
  bun: string;
  asset: string;
}

const TARGETS: Record<string, Target> = {
  "darwin-arm64": { bun: "bun-darwin-arm64", asset: "gpc-darwin-arm64" },
  "darwin-x64": { bun: "bun-darwin-x64", asset: "gpc-darwin-x64" },
  "linux-x64": { bun: "bun-linux-x64", asset: "gpc-linux-x64" },
  "linux-arm64": { bun: "bun-linux-arm64", asset: "gpc-linux-arm64" },
  "windows-x64": { bun: "bun-windows-x64", asset: "gpc-windows-x64.exe" },
};

function detectCurrentTarget(): string {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const platform = process.platform === "win32" ? "windows" : process.platform;
  return `${platform}-${arch}`;
}

function readVersion(): string {
  const pkgPath = join(ROOT, "packages", "cli", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version || "0.0.0";
}

async function bundle(): Promise<void> {
  const version = readVersion();
  console.log(`Bundling v${version} with esbuild...`);

  const result = await build({
    entryPoints: [join(ROOT, "packages", "cli", "src", "bin.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: BUNDLE_PATH,
    metafile: true,
    treeShaking: true,
    // Preserve identifiers for readable stack traces; minify syntax/whitespace
    minifySyntax: true,
    minifyWhitespace: true,
    minifyIdentifiers: false,
    // Mark binary mode and inject version
    define: {
      "process.env.__GPC_BINARY": '"1"',
      "process.env.__GPC_VERSION": JSON.stringify(version),
    },
    // Node builtins are external (provided by Bun runtime).
    // undici is dynamically imported for proxy — skipped in binary mode (Bun handles proxy natively).
    external: [
      "node:child_process",
      "node:crypto",
      "node:events",
      "node:fs",
      "node:fs/promises",
      "node:http",
      "node:https",
      "node:module",
      "node:net",
      "node:os",
      "node:path",
      "node:process",
      "node:readline",
      "node:stream",
      "node:tls",
      "node:url",
      "node:util",
      "node:zlib",
      "child_process",
      "crypto",
      "events",
      "fs",
      "fs/promises",
      "http",
      "https",
      "net",
      "os",
      "path",
      "process",
      "readline",
      "stream",
      "tls",
      "url",
      "util",
      "zlib",
      "undici",
    ],
    // Resolve workspace packages
    conditions: ["import"],
    mainFields: ["module", "main"],
    banner: {
      js: [
        "#!/usr/bin/env bun",
        'import { createRequire } from "node:module";',
        "const require = createRequire(import.meta.url);",
      ].join("\n"),
    },
  });

  // Write metafile for bundle analysis
  if (result.metafile) {
    writeFileSync(META_PATH, JSON.stringify(result.metafile, null, 2), "utf-8");
  }

  const bundleSize = statSync(BUNDLE_PATH).size;
  console.log(`  Bundle: ${BUNDLE_PATH} (${(bundleSize / 1024).toFixed(0)} KB)`);
  console.log(`  Metafile: ${META_PATH}`);
}

function compile(targetKey: string): string {
  const target = TARGETS[targetKey];
  if (!target) {
    console.error(`Unknown target: ${targetKey}`);
    console.error(`Available: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(1);
  }

  mkdirSync(DIST, { recursive: true });
  const outfile = join(DIST, target.asset);

  console.log(`Compiling for ${targetKey}...`);

  execFileSync("bun", [
    "build",
    "--compile",
    `--target=${target.bun}`,
    BUNDLE_PATH,
    `--outfile=${outfile}`,
  ], {
    cwd: ROOT,
    stdio: "inherit",
  });

  const size = statSync(outfile).size;
  console.log(`  Binary: ${outfile} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  return outfile;
}

function generateChecksum(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");
  const targetFlag = args.find((a) => a.startsWith("--target=") || a.startsWith("--target "));
  const bundleOnly = args.includes("--bundle-only");

  // Also support --target linux-x64 (space-separated)
  let targetValue: string | undefined;
  if (targetFlag) {
    targetValue = targetFlag.includes("=") ? targetFlag.split("=")[1]! : args[args.indexOf("--target") + 1];
  }

  // Step 1: Bundle
  await bundle();

  if (bundleOnly) {
    console.log("\nBundle-only mode. Skipping compilation.");
    return;
  }

  // Step 2: Determine targets
  let targets: string[];
  if (isAll) {
    targets = Object.keys(TARGETS);
  } else if (targetValue) {
    targets = [targetValue];
  } else {
    targets = [detectCurrentTarget()];
  }

  // Step 3: Compile
  const checksums: string[] = [];

  for (const t of targets) {
    const outfile = compile(t);
    const hash = generateChecksum(outfile);
    checksums.push(`${hash}  ${TARGETS[t]!.asset}`);
    console.log(`  SHA256: ${hash}`);
  }

  // Step 4: Write checksums
  const checksumPath = join(DIST, "checksums.txt");
  writeFileSync(checksumPath, checksums.join("\n") + "\n", "utf-8");
  console.log(`\nChecksums: ${checksumPath}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
