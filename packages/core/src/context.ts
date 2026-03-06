import type { AuthClient } from "@gpc/auth";
import type { ResolvedConfig, OutputFormat } from "@gpc/config";

export interface CommandContext {
  config: ResolvedConfig;
  auth: AuthClient;
  output: OutputFormat;
  verbose: boolean;
  quiet: boolean;
  app?: string;
}
