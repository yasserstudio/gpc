// Named exports only. No default export.

import type { Command } from "commander";
import { runPreflight, getAllScannerNames, formatOutput, GpcError } from "@gpc-cli/core";
import type { FindingSeverity } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { loadConfig } from "@gpc-cli/config";
import { green, red, yellow, dim, bold } from "../colors.js";

const SEVERITY_ICONS: Record<FindingSeverity, string> = {
  critical: "✗",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

function severityColor(severity: FindingSeverity, text: string): string {
  switch (severity) {
    case "critical":
      return bold(red(text));
    case "error":
      return red(text);
    case "warning":
      return yellow(text);
    case "info":
      return dim(text);
  }
}

export function registerPreflightCommand(program: Command): void {
  const cmd = program
    .command("preflight [file]")
    .description("Pre-submission compliance scanner for AAB files (offline)")
    .option(
      "--fail-on <severity>",
      "Fail if any finding meets or exceeds severity: critical, error, warning, info",
      "error",
    )
    .option("--scanners <names>", "Comma-separated scanner names to run (default: all)")
    .option("--metadata <dir>", "Path to metadata directory (Fastlane format) for listing checks")
    .option("--source <dir>", "Path to source directory for code scanning")
    .option("--config <path>", "Path to .preflightrc.json config file")
    .action(async (file: string | undefined, options) => {
      await runPreflightAction(program, file, options);
    });

  // Subcommand: preflight manifest
  cmd
    .command("manifest <file>")
    .description("Run manifest scanner only")
    .option("--fail-on <severity>", "Fail threshold", "error")
    .action(async (file: string, options) => {
      await runPreflightAction(program, file, { ...options, scanners: "manifest" });
    });

  // Subcommand: preflight permissions
  cmd
    .command("permissions <file>")
    .description("Run permissions scanner only")
    .option("--fail-on <severity>", "Fail threshold", "error")
    .action(async (file: string, options) => {
      await runPreflightAction(program, file, { ...options, scanners: "permissions" });
    });

  // Subcommand: preflight metadata
  cmd
    .command("metadata <dir>")
    .description("Run metadata scanner on a listings directory")
    .option("--fail-on <severity>", "Fail threshold", "error")
    .action(async (dir: string, options) => {
      await runPreflightAction(program, undefined, {
        ...options,
        metadata: dir,
        scanners: "metadata",
      });
    });

  // Subcommand: preflight codescan
  cmd
    .command("codescan <dir>")
    .description("Run code scanners (secrets, billing, privacy) on source directory")
    .option("--fail-on <severity>", "Fail threshold", "error")
    .action(async (dir: string, options) => {
      await runPreflightAction(program, undefined, {
        ...options,
        source: dir,
        scanners: "secrets,billing,privacy",
      });
    });
}

async function runPreflightAction(
  program: Command,
  file: string | undefined,
  options: Record<string, string | undefined>,
): Promise<void> {
  if (!file && !options["metadata"] && !options["source"]) {
    throw new GpcError(
      "Provide an AAB file, --metadata <dir>, or --source <dir>",
      "MISSING_INPUT",
      2,
      "gpc preflight app.aab",
    );
  }

  const failOn = options["failOn"] as FindingSeverity | undefined;
  const validSeverities = new Set(["critical", "error", "warning", "info"]);
  if (failOn && !validSeverities.has(failOn)) {
    throw new GpcError(
      `Invalid --fail-on value "${failOn}". Use: critical, error, warning, info`,
      "INVALID_OPTION",
      2,
    );
  }

  const scannerNames = options["scanners"]?.split(",").map((s) => s.trim());
  if (scannerNames) {
    const known = new Set(getAllScannerNames());
    const unknown = scannerNames.filter((s) => !known.has(s));
    if (unknown.length > 0) {
      throw new GpcError(
        `Unknown scanner(s): ${unknown.join(", ")}. Available: ${getAllScannerNames().join(", ")}`,
        "UNKNOWN_SCANNER",
        2,
      );
    }
  }

  const config = await loadConfig();
  const format = getOutputFormat(program, config);

  const result = await runPreflight({
    aabPath: file,
    metadataDir: options["metadata"],
    sourceDir: options["source"],
    scanners: scannerNames,
    failOn,
    configPath: options["config"],
  });

  if (format === "json") {
    console.log(formatOutput(result, format));
  } else {
    // Header
    console.log(bold("GPC Preflight Scanner"));
    if (file) console.log(dim(`File: ${file}`));
    console.log(dim(`Scanners: ${result.scanners.join(", ")}`));
    console.log("");

    if (result.findings.length === 0) {
      console.log(green("✓ No issues found"));
    } else {
      // Group by severity
      for (const finding of result.findings) {
        const icon = SEVERITY_ICONS[finding.severity];
        const label = severityColor(
          finding.severity,
          `${icon} ${finding.severity.toUpperCase()}`,
        );
        console.log(`${label}  ${finding.title}`);
        console.log(`        ${dim(finding.message)}`);
        if (finding.suggestion) {
          console.log(`        ${dim("→")} ${finding.suggestion}`);
        }
        if (finding.policyUrl) {
          console.log(`        ${dim(finding.policyUrl)}`);
        }
        console.log("");
      }
    }

    // Summary line
    const parts: string[] = [];
    if (result.summary.critical > 0) parts.push(bold(red(`${result.summary.critical} critical`)));
    if (result.summary.error > 0) parts.push(red(`${result.summary.error} error`));
    if (result.summary.warning > 0) parts.push(yellow(`${result.summary.warning} warning`));
    if (result.summary.info > 0) parts.push(dim(`${result.summary.info} info`));

    const summaryLine = parts.length > 0 ? parts.join(", ") : green("0 issues");
    const passedLabel = result.passed ? green("✓ PASSED") : red("✗ FAILED");
    console.log(`${passedLabel}  ${summaryLine}  ${dim(`(${result.durationMs}ms)`)}`);

    // Verification deadline awareness (auto-expires Sep 2026)
    if (Date.now() < new Date("2026-09-01").getTime()) {
      console.log("");
      console.log(
        dim(
          "Note: Apps must be registered by a verified developer to be installable on",
        ),
      );
      console.log(
        dim(
          "certified Android devices after Sep 2026. Run 'gpc verify' for details.",
        ),
      );
    }
  }

  if (!result.passed) {
    process.exitCode = 6;
  }
}
