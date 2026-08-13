export { ConfigError } from "./errors.js";
export { loadConfig, findConfigFile, loadEnvConfig } from "./loader.js";
export { getConfigDir, getUserConfigPath, getDataDir, getCacheDir } from "./paths.js";
export {
  setConfigValue,
  deleteConfigValue,
  initConfig,
  setProfileConfig,
  deleteProfile,
  listProfiles,
  approvePlugin,
  revokePluginApproval,
  ensurePluginApprovalPolicy,
  resolvePluginApprovalId,
} from "./writer.js";
export { DEFAULT_CONFIG } from "./defaults.js";
export type {
  GpcConfig,
  AuthConfig,
  ProfileConfig,
  ResolvedConfig,
  OutputFormat,
  WebhookConfig,
  GamesConfig,
  ReportsConfig,
} from "./types.js";
