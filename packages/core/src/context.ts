import type { AuthClient } from "@gpc-cli/auth";
import type { ResolvedConfig, OutputFormat } from "@gpc-cli/config";

export interface CommandContext {
  config: ResolvedConfig;
  auth: AuthClient;
  output: OutputFormat;
  verbose: boolean;
  quiet: boolean;
  app?: string;
}
