export interface WebhookConfig {
  slack?: string;
  discord?: string;
  custom?: string;
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
  webhooks?: WebhookConfig;
}

export interface AuthConfig {
  serviceAccount?: string;
}

export interface ProfileConfig {
  auth?: AuthConfig;
  app?: string;
  developerId?: string;
}

export type OutputFormat = "table" | "json" | "yaml" | "markdown";

export interface ResolvedConfig extends Required<Pick<GpcConfig, "output">> {
  app?: string;
  profile?: string;
  auth?: AuthConfig;
  configPath?: string;
  developerId?: string;
  plugins?: string[];
  profiles?: Record<string, ProfileConfig>;
  approvedPlugins?: string[];
  webhooks?: WebhookConfig;
}
