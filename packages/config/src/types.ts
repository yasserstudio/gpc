export interface WebhookConfig {
  slack?: string;
  discord?: string;
  custom?: string;
}

export interface VitalsThresholds {
  crashRate?: number;
  anrRate?: number;
}

export interface GamesConfig {
  applicationId?: string;
}

export interface ReportsConfig {
  // GCS bucket holding Play bulk reports (financial/stats CSVs). Defaults to
  // pubsite_prod_<developerId> when unset; override here when the account's bucket name
  // differs (copy the exact URI from Play Console -> Download reports).
  bucket?: string;
}

export interface GpcConfig {
  app?: string;
  output?: OutputFormat;
  profile?: string;
  auth?: AuthConfig;
  developerId?: string;
  plugins?: string[];
  profiles?: Record<string, ProfileConfig>;
  approvedPlugins?: string[];
  /** Approvals grandfathered when manifest permissions became mandatory. User-config only. */
  legacyApprovedPlugins?: string[];
  /** Internal migration marker for the plugin approval policy. User-config only. */
  pluginApprovalPolicyVersion?: number;
  webhooks?: WebhookConfig;
  vitals?: { thresholds?: VitalsThresholds };
  games?: GamesConfig;
  reports?: ReportsConfig;
  debug?: boolean;
}

export interface AuthConfig {
  serviceAccount?: string;
}

export interface ProfileConfig {
  auth?: AuthConfig;
  app?: string;
  developerId?: string;
  reports?: ReportsConfig;
}

export type OutputFormat = "table" | "json" | "yaml" | "markdown" | "junit" | "csv" | "tsv";

export interface ResolvedConfig extends Required<Pick<GpcConfig, "output">> {
  app?: string;
  profile?: string;
  auth?: AuthConfig;
  configPath?: string;
  developerId?: string;
  plugins?: string[];
  profiles?: Record<string, ProfileConfig>;
  approvedPlugins?: string[];
  legacyApprovedPlugins?: string[];
  pluginApprovalPolicyVersion?: number;
  webhooks?: WebhookConfig;
  vitals?: { thresholds?: VitalsThresholds };
  games?: GamesConfig;
  reports?: ReportsConfig;
  debug?: boolean;
}
