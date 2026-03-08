export interface GpcConfig {
  app?: string;
  output?: OutputFormat;
  profile?: string;
  auth?: AuthConfig;
  developerId?: string;
  plugins?: string[];
}

export interface AuthConfig {
  serviceAccount?: string;
}

export type OutputFormat = "table" | "json" | "yaml" | "markdown";

export interface ResolvedConfig extends Required<Pick<GpcConfig, "output">> {
  app?: string;
  profile?: string;
  auth?: AuthConfig;
  configPath?: string;
  developerId?: string;
  plugins?: string[];
}
