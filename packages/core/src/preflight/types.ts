// Named exports only. No default export.

export type FindingSeverity = "critical" | "error" | "warning" | "info";

/** Severity ordering for threshold comparisons. */
export const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

export interface PreflightFinding {
  /** Scanner name, e.g. "manifest", "permissions" */
  scanner: string;
  /** Machine-readable rule ID, e.g. "targetSdk-below-minimum" */
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  suggestion?: string;
  /** Link to the relevant Google Play policy page */
  policyUrl?: string;
}

export interface PreflightContext {
  aabPath?: string;
  manifest?: ParsedManifest;
  zipEntries?: ZipEntryInfo[];
  metadataDir?: string;
  sourceDir?: string;
  config: PreflightConfig;
}

export interface PreflightResult {
  scanners: string[];
  findings: PreflightFinding[];
  summary: Record<FindingSeverity, number>;
  passed: boolean;
  durationMs: number;
}

export interface PreflightScanner {
  name: string;
  description: string;
  requires: ("manifest" | "zipEntries" | "metadataDir" | "sourceDir")[];
  scan(ctx: PreflightContext): Promise<PreflightFinding[]>;
}

export interface PreflightConfig {
  failOn: FindingSeverity;
  targetSdkMinimum: number;
  maxDownloadSizeMb: number;
  allowedPermissions: string[];
  disabledRules: string[];
  severityOverrides: Record<string, FindingSeverity>;
}

export interface PreflightOptions {
  aabPath?: string;
  metadataDir?: string;
  sourceDir?: string;
  scanners?: string[];
  failOn?: FindingSeverity;
  configPath?: string;
}

export interface ParsedManifest {
  packageName: string;
  versionCode: number;
  versionName: string;
  minSdk: number;
  targetSdk: number;
  debuggable: boolean;
  testOnly: boolean;
  usesCleartextTraffic: boolean;
  extractNativeLibs: boolean;
  permissions: string[];
  features: ManifestFeature[];
  activities: ManifestComponent[];
  services: ManifestComponent[];
  receivers: ManifestComponent[];
  providers: ManifestComponent[];
  /** Set when the manifest could not be fully parsed — manifest-dependent scanners should skip. */
  _parseError?: string;
}

export interface ManifestFeature {
  name: string;
  required: boolean;
}

export interface ManifestComponent {
  name: string;
  exported?: boolean;
  foregroundServiceType?: string;
  hasIntentFilter: boolean;
}

export interface ZipEntryInfo {
  path: string;
  compressedSize: number;
  uncompressedSize: number;
}

export const DEFAULT_PREFLIGHT_CONFIG: PreflightConfig = {
  failOn: "error",
  targetSdkMinimum: 35,
  maxDownloadSizeMb: 150,
  allowedPermissions: [],
  disabledRules: [],
  severityOverrides: {},
};
