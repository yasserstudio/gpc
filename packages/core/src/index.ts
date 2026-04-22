export { GpcError, ConfigError, ApiError, NetworkError } from "./errors.js";
export {
  detectOutputFormat,
  formatOutput,
  formatJunit,
  redactSensitive,
  SENSITIVE_KEYS,
  maybePaginate,
} from "./output.js";
export type { CommandContext } from "./context.js";
export { PluginManager, discoverPlugins } from "./plugins.js";
export type { LoadedPlugin, DiscoverPluginsOptions } from "./plugins.js";
export { getAppInfo } from "./commands/apps.js";
export type { AppInfo } from "./commands/apps.js";
export {
  uploadRelease,
  waitForBundleProcessing,
  getReleasesStatus,
  promoteRelease,
  updateRollout,
  listTracks,
  createTrack,
  updateTrackConfig,
  uploadExternallyHosted,
  diffReleases,
  fetchReleaseNotes,
  applyReleaseNotes,
} from "./commands/releases.js";
export type {
  UploadResult,
  ReleaseStatusResult,
  DryRunUploadResult,
  ReleaseDiff,
  ApplyReleaseNotesResult,
} from "./commands/releases.js";
export {
  getListings,
  updateListing,
  deleteListing,
  pullListings,
  pushListings,
  diffListingsCommand,
  diffListingsEnhanced,
  lintLocalListings,
  analyzeRemoteListings,
  listImages,
  uploadImage,
  deleteImage,
  getCountryAvailability,
  updateAppDetails,
  exportImages,
} from "./commands/listings.js";
export type {
  ListingsResult,
  PushResult,
  DryRunResult,
  ExportImagesOptions,
  ExportImagesSummary,
} from "./commands/listings.js";
export {
  lintListings,
  lintListing,
  wordDiff,
  formatWordDiff,
  DEFAULT_LIMITS,
} from "./utils/listing-text.js";
export type {
  ListingLintResult,
  FieldLintResult,
  ListingFieldLimits,
  DiffToken,
} from "./utils/listing-text.js";
export {
  detectFastlane,
  parseFastfile,
  parseAppfile,
  generateMigrationPlan,
  writeMigrationOutput,
} from "./commands/migrate.js";
export type { FastlaneDetection, FastlaneLane, MigrationResult } from "./commands/migrate.js";
export { isValidBcp47, GOOGLE_PLAY_LANGUAGES } from "./utils/bcp47.js";
export {
  validatePackageName,
  validateVersionCode,
  validateLanguageCode,
  validateTrackName,
  validateSku,
} from "./utils/validation.js";
export { validateUploadFile } from "./utils/file-validation.js";
export type { FileValidationResult } from "./utils/file-validation.js";
export { readReleaseNotesFromDir, validateReleaseNotes } from "./utils/release-notes.js";
export type { ReleaseNotesValidation } from "./utils/release-notes.js";
export { validatePreSubmission } from "./commands/validate.js";
export type { ValidateOptions, ValidateCheck, ValidateResult } from "./commands/validate.js";
export { publish } from "./commands/publish.js";
export type { PublishOptions, PublishResult, DryRunPublishResult } from "./commands/publish.js";
export { readListingsFromDir, writeListingsToDir, diffListings } from "./utils/fastlane.js";
export type { ListingDiff } from "./utils/fastlane.js";
export {
  listReviews,
  getReview,
  replyToReview,
  exportReviews,
  analyzeReviews,
} from "./commands/reviews.js";
export type {
  ReviewsFilterOptions,
  ReviewExportOptions,
  ReviewAnalysis,
} from "./commands/reviews.js";
export type { ListSubscriptionsOptions, SubscriptionAnalytics } from "./commands/subscriptions.js";
export { getSubscriptionAnalytics } from "./commands/subscriptions.js";
export type { ListIapOptions } from "./commands/iap.js";
export type { ListVoidedOptions } from "./commands/purchases.js";
export type { ListUsersOptions } from "./commands/users.js";
export {
  getVitalsOverview,
  getVitalsCrashes,
  getVitalsAnr,
  getVitalsStartup,
  getVitalsRendering,
  getVitalsBattery,
  getVitalsMemory,
  getVitalsLmk,
  getVitalsErrorCount,
  getVitalsAnomalies,
  searchVitalsErrors,
  compareVitalsTrend,
  checkThreshold,
} from "./commands/vitals.js";
export { compareVersionVitals, watchVitalsWithAutoHalt } from "./commands/vitals.js";
export type {
  VitalsQueryOptions,
  VitalsOverview,
  VitalsTrendComparison,
  ThresholdResult,
  VersionVitalsRow,
  VersionVitalsComparison,
  WatchVitalsOptions,
} from "./commands/vitals.js";
export { validateImage } from "./utils/image-validation.js";
export type { ImageValidationResult } from "./utils/image-validation.js";
export {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  activateBasePlan,
  deactivateBasePlan,
  deleteBasePlan,
  migratePrices,
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
  diffSubscription,
} from "./commands/subscriptions.js";
export type { SubscriptionDiff } from "./commands/subscriptions.js";
export {
  listInAppProducts,
  getInAppProduct,
  createInAppProduct,
  updateInAppProduct,
  deleteInAppProduct,
  syncInAppProducts,
} from "./commands/iap.js";
export type { SyncResult } from "./commands/iap.js";
export {
  getProductPurchase,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  deferSubscriptionPurchase,
  revokeSubscriptionPurchase,
  listVoidedPurchases,
  refundOrder,
  getOrderDetails,
  batchGetOrders,
  getProductPurchaseV2,
  cancelSubscriptionV2,
  deferSubscriptionV2,
} from "./commands/purchases.js";
export { convertRegionPrices } from "./commands/pricing.js";
export {
  listReports,
  downloadReport,
  parseMonth,
  isValidReportType,
  isFinancialReportType,
  isStatsReportType,
  isValidStatsDimension,
} from "./commands/reports.js";
export type { ParsedMonth } from "./commands/reports.js";
export {
  listUsers,
  getUser,
  inviteUser,
  updateUser,
  removeUser,
  parseGrantArg,
  PERMISSION_PROPAGATION_WARNING,
} from "./commands/users.js";
export { listGrants, createGrant, updateGrant, deleteGrant } from "./commands/grants.js";
export {
  listTesters,
  addTesters,
  removeTesters,
  importTestersFromCsv,
} from "./commands/testers.js";
export { generateNotesFromGit } from "./utils/git-notes.js";
export type { GitNotesOptions, GitReleaseNotes } from "./utils/git-notes.js";
export {
  listRecoveryActions,
  cancelRecoveryAction,
  deployRecoveryAction,
  createRecoveryAction,
  addRecoveryTargeting,
} from "./commands/app-recovery.js";
export { updateDataSafety, importDataSafety } from "./commands/data-safety.js";
export {
  createExternalTransaction,
  getExternalTransaction,
  refundExternalTransaction,
} from "./commands/external-transactions.js";
export { listDeviceTiers, getDeviceTier, createDeviceTier } from "./commands/device-tiers.js";
export {
  listOneTimeProducts,
  getOneTimeProduct,
  createOneTimeProduct,
  updateOneTimeProduct,
  deleteOneTimeProduct,
  listOneTimeOffers,
  getOneTimeOffer,
  createOneTimeOffer,
  updateOneTimeOffer,
  deleteOneTimeOffer,
  diffOneTimeProduct,
} from "./commands/one-time-products.js";
export type { OneTimeProductDiff } from "./commands/one-time-products.js";
export { createSpinner } from "./utils/spinner.js";
export {
  startTrain,
  getTrainStatus,
  pauseTrain,
  abortTrain,
  advanceTrain,
} from "./commands/train.js";
export { listLeaderboards, listAchievements, listEvents } from "./commands/games.js";
export { createEnterpriseApp, publishEnterpriseApp } from "./commands/enterprise.js";
export type { CreateEnterpriseAppParams } from "./commands/enterprise.js";
export type { TrainConfig, TrainState } from "./commands/train.js";
export { getQuotaUsage } from "./commands/quota.js";
export type { QuotaUsage } from "./commands/quota.js";
export type { Spinner } from "./utils/spinner.js";
export { safePath, safePathWithin } from "./utils/safe-path.js";
export { initProject } from "./commands/init.js";
export type { InitOptions, InitResult } from "./commands/init.js";
export { runPreflight, getAllScannerNames } from "./preflight/index.js";
export { loadPreflightConfig } from "./preflight/index.js";
export type {
  FindingSeverity,
  PreflightFinding,
  PreflightResult,
  PreflightOptions,
  PreflightConfig,
  PreflightScanner,
  ParsedManifest,
} from "./preflight/index.js";
export { DEFAULT_PREFLIGHT_CONFIG, SEVERITY_ORDER } from "./preflight/index.js";
export { sortResults } from "./utils/sort.js";
export { scaffoldPlugin } from "./commands/plugin-scaffold.js";
export type { ScaffoldOptions, ScaffoldResult } from "./commands/plugin-scaffold.js";
export {
  initAudit,
  writeAuditLog,
  createAuditEntry,
  redactAuditArgs,
  SENSITIVE_ARG_KEYS,
  listAuditEvents,
  searchAuditEvents,
  clearAuditLog,
} from "./audit.js";
export type { AuditEntry } from "./audit.js";
export {
  sendWebhook,
  formatSlackPayload,
  formatDiscordPayload,
  formatCustomPayload,
} from "./utils/webhooks.js";
export type { WebhookPayload } from "./utils/webhooks.js";
export { uploadInternalSharing } from "./commands/internal-sharing.js";
export type { InternalSharingUploadResult } from "./commands/internal-sharing.js";
export { listGeneratedApks, downloadGeneratedApk } from "./commands/generated-apks.js";
// purchase-options: standalone resource removed (phantom API — does not exist in Google Play API).
// Purchase options are managed through oneTimeProducts.purchaseOptions paths.
export { batchSyncInAppProducts } from "./commands/iap.js";
export type { BatchSyncResult } from "./commands/iap.js";
export {
  analyzeBundle,
  compareBundles,
  topFiles,
  checkBundleSize,
} from "./commands/bundle-analysis.js";
export type {
  BundleEntry,
  BundleAnalysis,
  BundleComparison,
  BundleSizeConfig,
  BundleSizeCheckResult,
} from "./commands/bundle-analysis.js";
export {
  getAppStatus,
  formatStatusTable,
  formatStatusSummary,
  computeStatusDiff,
  formatStatusDiff,
  loadStatusCache,
  saveStatusCache,
  statusHasBreach,
  runWatchLoop,
  trackBreachState,
  sendNotification,
  relativeTime,
} from "./commands/status.js";
export type {
  AppStatus,
  StatusRelease,
  StatusVitalMetric,
  StatusReviews,
  StatusDiff,
  GetAppStatusOptions,
  WatchOptions,
} from "./commands/status.js";

export { fetchChangelog, formatChangelogEntry } from "./commands/changelog.js";
export type { ChangelogEntry, FetchChangelogOptions } from "./commands/changelog.js";

export {
  generateChangelog,
  defaultGitRunner,
  parseCommit,
  parseRemoteUrl,
  SECTION_ORDER,
} from "./commands/changelog-generate.js";
export type {
  OutputMode,
  GitRunner,
  RawCommit,
  ParsedCommit,
  CommitCluster,
  GeneratedChangelog,
  GenerateOptions,
} from "./commands/changelog-generate.js";
export {
  RENDERERS,
  renderMarkdown,
  renderJson,
  renderPrompt,
  renderPlayStore,
  renderPlayStoreMd,
  renderPlayStoreJson,
  renderPlayStorePrompt,
  buildLocaleBundle,
  translateBundle,
  PLAY_STORE_LIMIT,
  PLACEHOLDER_TEXT,
  validateBundleForApply,
  bundleToReleaseNotes,
} from "./commands/changelog-renderers/index.js";
export type {
  Renderer,
  LocaleBundle,
  LocaleEntry,
  PlayStoreFormat,
  PlayStoreRenderOptions,
  TranslateBundleOptions,
  TranslatedBundle,
  TranslationFailure,
} from "./commands/changelog-renderers/index.js";
export { resolveLocales } from "./commands/changelog-locales.js";
export type { ResolveLocalesOptions } from "./commands/changelog-locales.js";

export {
  resolveAiConfig,
  createTranslator,
  fetchAggregateCost,
  classifyError,
  formatPathLabel,
  PROVIDER_WHITELIST,
  DEFAULT_MODELS,
} from "./commands/changelog-ai.js";
export type {
  Provider,
  TranslationPath,
  ErrorReason,
  TranslationResult,
  Translator,
  TranslatorConfig,
  ResolveAiConfigOptions,
} from "./commands/changelog-ai.js";

export { getRtdnStatus, decodeNotification, formatNotification } from "./commands/rtdn.js";
export type { RtdnStatus, DecodedNotification } from "./commands/rtdn.js";
