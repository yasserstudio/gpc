export { resolveAuth } from "./resolve.js";
export { loadServiceAccountKey, createServiceAccountAuth } from "./service-account.js";
export { clearTokenCache, acquireToken } from "./token-cache.js";
export {
  DEFAULT_SCOPES,
  STORAGE_READ_ONLY_SCOPE,
  ANDROID_PUBLISHER_SCOPE,
  REPORTING_SCOPE,
  scopedCacheKey,
} from "./scopes.js";
export { AuthError } from "./errors.js";
export type { AuthOptions, AuthClient, ServiceAccountKey } from "./types.js";
