import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { readJsonFile } from "../json.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

function parsePositiveInt(str: string, label: string): number {
  const n = parseInt(str, 10);
  if (isNaN(n) || n <= 0) {
    const err = new Error(`${label} must be a positive number`);
    Object.assign(err, { code: "USAGE_ERROR", exitCode: 2 });
    throw err;
  }
  return n;
}

export function registerSystemApksCommands(program: Command): void {
  const cmd = program
    .command("system-apks")
    .description("Manage system APKs for OEM pre-installs");

  cmd
    .command("list <version-code>")
    .description("List system APK variants for a version code")
    .action(async (versionCodeStr: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const versionCode = parsePositiveInt(versionCodeStr, "version-code");

      const result = await client.systemApks.list(packageName, versionCode);
      const variants = result.variants || [];
      if (variants.length === 0) {
        console.log("No system APK variants found.");
      } else {
        console.log(formatOutput(variants, format));
      }
    });

  cmd
    .command("get <version-code> <variant-id>")
    .description("Get a system APK variant")
    .action(async (versionCodeStr: string, variantIdStr: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const versionCode = parsePositiveInt(versionCodeStr, "version-code");
      const variantId = parsePositiveInt(variantIdStr, "variant-id");

      const result = await client.systemApks.get(packageName, versionCode, variantId);
      console.log(formatOutput(result, format));
    });

  cmd
    .command("create <version-code>")
    .description("Create a system APK variant from a device spec JSON file")
    .requiredOption("--file <path>", "JSON file with device spec (supportedAbis, supportedLocales, screenDensity)")
    .action(async (versionCodeStr: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const versionCode = parsePositiveInt(versionCodeStr, "version-code");

      if (isDryRun(program)) {
        printDryRun({ command: "system-apks create", action: "create system APK variant", target: `v${versionCode}`, details: { file: options.file } }, format, formatOutput);
        return;
      }

      const client = await getClient(config);
      const spec = await readJsonFile(options.file);
      const result = await client.systemApks.create(packageName, versionCode, spec as any);
      console.log(formatOutput(result, format));
    });

  cmd
    .command("download <version-code> <variant-id>")
    .description("Download a system APK variant")
    .requiredOption("--output <path>", "Output file path")
    .action(async (versionCodeStr: string, variantIdStr: string, options: { output: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const versionCode = parsePositiveInt(versionCodeStr, "version-code");
      const variantId = parsePositiveInt(variantIdStr, "variant-id");

      const outputPath = resolve(options.output);
      if (outputPath.includes("\0")) {
        const err = new Error("Output path contains null bytes");
        Object.assign(err, { code: "USAGE_ERROR", exitCode: 2 });
        throw err;
      }
      try {
        await access(outputPath);
        // File exists -- require confirmation
        await requireConfirm(`File "${outputPath}" already exists. Overwrite?`, program);
      } catch {
        // File does not exist -- safe to write
      }

      const client = await getClient(config);
      const data = await client.systemApks.download(packageName, versionCode, variantId);
      await writeFile(outputPath, Buffer.from(data));
      console.log(`Downloaded to ${outputPath}`);
    });
}
