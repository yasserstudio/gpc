// Named exports only. No default export.

import type {
  PreflightOptions,
  PreflightResult,
  PreflightContext,
  PreflightScanner,
  PreflightFinding,
  FindingSeverity,
} from "./types.js";
import { SEVERITY_ORDER, DEFAULT_PREFLIGHT_CONFIG } from "./types.js";
import { loadPreflightConfig } from "./config.js";
import { readAab } from "./aab-reader.js";
import { manifestScanner } from "./scanners/manifest-scanner.js";
import { permissionsScanner } from "./scanners/permissions-scanner.js";
import { nativeLibsScanner } from "./scanners/native-libs-scanner.js";
import { metadataScanner } from "./scanners/metadata-scanner.js";
import { secretsScanner } from "./scanners/secrets-scanner.js";
import { billingScanner } from "./scanners/billing-scanner.js";
import { privacyScanner } from "./scanners/privacy-scanner.js";
import { policyScanner } from "./scanners/policy-scanner.js";
import { sizeScanner } from "./scanners/size-scanner.js";

/** All registered scanners. New scanners are added here. */
const ALL_SCANNERS: PreflightScanner[] = [
  manifestScanner,
  permissionsScanner,
  nativeLibsScanner,
  metadataScanner,
  secretsScanner,
  billingScanner,
  privacyScanner,
  policyScanner,
  sizeScanner,
];

export function getAllScannerNames(): string[] {
  return ALL_SCANNERS.map((s) => s.name);
}

export async function runPreflight(options: PreflightOptions): Promise<PreflightResult> {
  const start = Date.now();

  // Load config (file + CLI overrides)
  const fileConfig = await loadPreflightConfig(options.configPath);
  const config = {
    ...fileConfig,
    failOn: options.failOn ?? fileConfig.failOn ?? DEFAULT_PREFLIGHT_CONFIG.failOn,
  };

  // Build context
  const ctx: PreflightContext = { config };

  // Open AAB if provided
  const earlyFindings: PreflightFinding[] = [];
  if (options.aabPath) {
    ctx.aabPath = options.aabPath;
    const aab = await readAab(options.aabPath);
    ctx.manifest = aab.manifest;
    ctx.zipEntries = aab.entries;
    ctx.nativeLibHeaders = aab.nativeLibHeaders;

    // If manifest had a parse error, emit a warning and clear manifest
    // so manifest-dependent scanners are skipped gracefully
    if (aab.manifest._parseError) {
      earlyFindings.push({
        scanner: "manifest-parser",
        ruleId: "manifest-parse-error",
        severity: "warning",
        title: "Manifest could not be fully parsed",
        message: aab.manifest._parseError,
        suggestion: "Manifest-dependent scanners (manifest, permissions, policy, privacy) were skipped. Other scanners (native-libs, size, secrets, billing) still ran.",
      });
      ctx.manifest = undefined;
    }
  }

  if (options.metadataDir) ctx.metadataDir = options.metadataDir;
  if (options.sourceDir) ctx.sourceDir = options.sourceDir;

  // Filter scanners
  const requestedNames = options.scanners
    ? new Set(options.scanners.map((s) => s.toLowerCase()))
    : null;

  const applicableScanners = ALL_SCANNERS.filter((scanner) => {
    // Filter by name if specified
    if (requestedNames && !requestedNames.has(scanner.name)) return false;

    // Filter by context availability
    for (const req of scanner.requires) {
      if (req === "manifest" && !ctx.manifest) return false;
      if (req === "zipEntries" && !ctx.zipEntries) return false;
      if (req === "metadataDir" && !ctx.metadataDir) return false;
      if (req === "sourceDir" && !ctx.sourceDir) return false;
    }

    return true;
  });

  // Run all applicable scanners in parallel — use allSettled so one failure doesn't stop others
  const settled = await Promise.allSettled(applicableScanners.map((scanner) => scanner.scan(ctx)));

  // Flatten findings, report scanner failures as error findings
  let findings: PreflightFinding[] = [...earlyFindings];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    if (result.status === "fulfilled") {
      findings.push(...result.value);
    } else {
      const scanner = applicableScanners[i]!;
      findings.push({
        scanner: scanner.name,
        ruleId: "scanner-error",
        severity: "error",
        title: `Scanner "${scanner.name}" failed`,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        suggestion: "This scanner encountered an unexpected error. Other scanners still ran.",
      });
    }
  }

  // Apply disabled rules
  if (config.disabledRules.length > 0) {
    const disabled = new Set(config.disabledRules);
    findings = findings.filter((f) => !disabled.has(f.ruleId));
  }

  // Apply severity overrides
  if (Object.keys(config.severityOverrides).length > 0) {
    findings = findings.map((f) => {
      const override = config.severityOverrides[f.ruleId];
      return override ? { ...f, severity: override } : f;
    });
  }

  // Sort by severity (critical first)
  findings.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

  // Compute summary
  const summary: Record<FindingSeverity, number> = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const f of findings) summary[f.severity]++;

  // Check pass/fail threshold
  const failThreshold = SEVERITY_ORDER[config.failOn];
  const passed = !findings.some((f) => SEVERITY_ORDER[f.severity] >= failThreshold);

  return {
    scanners: applicableScanners.map((s) => s.name),
    findings,
    summary,
    passed,
    durationMs: Date.now() - start,
  };
}
