#!/usr/bin/env node

/**
 * Build standalone GPC binary using esbuild (bundle) + Bun (compile).
 *
 * Usage:
 *   npx tsx scripts/build-binary.ts                    # Current platform only
 *   npx tsx scripts/build-binary.ts --target linux-x64 # Specific target
 *   npx tsx scripts/build-binary.ts --all              # All platforms
 */

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist", "bin");
const BUNDLE_PATH = join(ROOT, "dist", "gpc-bundled.mjs");

interface Target {
  bun: string;
  asset: string;
}

const TARGETS: Record<string, Target> = {
  "darwin-arm64": { bun: "bun-darwin-arm64", asset: "gpc-darwin-arm64" },
  "darwin-x64": { bun: "bun-darwin-x64", asset: "gpc-darwin-x64" },
  "linux-x64": { bun: "bun-linux-x64", asset: "gpc-linux-x64" },
  "windows-x64": { bun: "bun-windows-x64", asset: "gpc-windows-x64.exe" },
};

function detectCurrentTarget(): string {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const platform = process.platform === "win32" ? "windows" : process.platform;
  return `${platform}-${arch}`;
}

async function bundle(): Promise<void> {
  console.log("Bundling with esbuild...");

  await build({
    entryPoints: [join(ROOT, "packages", "cli", "src", "bin.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: BUNDLE_PATH,
    minify: true,
    treeShaking: true,
    // Mark binary mode so plugins.ts can detect it
    define: {
      "process.env.__GPC_BINARY": '"1"',
    },
    // Node builtins are external (provided by Bun/Node runtime).
    // undici is dynamically imported for proxy support — excluded from bundle.
    external: [
      "node:child_process",
      "node:crypto",
      "node:events",
      "node:fs",
      "node:fs/promises",
      "node:http",
      "node:https",
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

  console.log(`  Bundle: ${BUNDLE_PATH}`);
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

  console.log(`  Binary: ${outfile}`);
  return outfile;
}

function generateChecksum(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");
  const targetFlag = args.find((a) => a.startsWith("--target="));
  const bundleOnly = args.includes("--bundle-only");

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
  } else if (targetFlag) {
    targets = [targetFlag.split("=")[1]!];
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
