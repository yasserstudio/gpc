import type { RateLimiter } from "./rate-limiter.js";

export interface RetryLogEntry {
  attempt: number;
  method: string;
  path: string;
  status?: number;
  error: string;
  delayMs: number;
  timestamp: string;
}

export interface ApiClientOptions {
  auth: {
    getAccessToken(): Promise<string>;
  };
  maxRetries?: number;
  timeout?: number;
  uploadTimeout?: number;
  baseDelay?: number;
  maxDelay?: number;
  rateLimitPerSecond?: number;
  baseUrl?: string;
  rateLimiter?: RateLimiter;
  onRetry?: (entry: RetryLogEntry) => void;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PagedResponse<T> {
  items: T[];
  nextPageToken?: string;
}

// Google Play API types

export interface AppDetails {
  defaultLanguage: string;
  title: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
}

export interface AppEdit {
  id: string;
  expiryTimeSeconds: string;
}

export type ChangesInReviewBehavior = "CANCEL_IN_REVIEW_AND_SUBMIT" | "ERROR_IF_IN_REVIEW";

export interface EditCommitOptions {
  changesNotSentForReview?: boolean;
  changesInReviewBehavior?: ChangesInReviewBehavior;
}

export type DeobfuscationFileType = "proguard" | "nativeCode";

export type ProductUpdateLatencyTolerance =
  | "PRODUCT_UPDATE_LATENCY_TOLERANCE_UNSPECIFIED"
  | "PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_SENSITIVE"
  | "PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_TOLERANT";

export interface MutationOptions {
  allowMissing?: boolean;
  latencyTolerance?: ProductUpdateLatencyTolerance;
}

export interface ExpansionFile {
  referencesVersion?: number;
  fileSize?: string;
}

export type ExpansionFileType = "main" | "patch";

export interface Track {
  track: string;
  releases: Release[];
}

export interface Release {
  name?: string;
  versionCodes: string[];
  status: ReleaseStatus;
  userFraction?: number;
  releaseNotes?: ReleaseNote[];
  inAppUpdatePriority?: number;
  countryTargeting?: {
    countries: string[];
    includeRestOfWorld: boolean;
  };
}

export type ReleaseStatus = "completed" | "draft" | "halted" | "inProgress";

export interface ReleaseNote {
  language: string;
  text: string;
}

export interface Bundle {
  versionCode: number;
  sha1: string;
  sha256: string;
}

export interface Listing {
  language: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  video?: string;
}

export interface Review {
  reviewId: string;
  authorName: string;
  comments: ReviewComment[];
}

export interface ReviewComment {
  userComment?: UserComment;
  developerComment?: DeveloperComment;
}

export interface UserComment {
  text: string;
  lastModified: { seconds: string };
  starRating: number;
  device?: string;
  androidOsVersion?: number;
  appVersionCode?: number;
  appVersionName?: string;
  thumbsUpCount?: number;
  thumbsDownCount?: number;
  reviewerLanguage?: string;
}

export interface DeveloperComment {
  text: string;
  lastModified: { seconds: string };
}

export interface TrackListResponse {
  tracks: Track[];
}

export interface BundleListResponse {
  bundles: Bundle[];
}

export interface UploadResponse {
  bundle?: Bundle;
  apk?: ApkInfo;
}

export interface ApkInfo {
  versionCode: number;
  binary: { sha1: string; sha256: string };
}

export interface ApksListResponse {
  apks: ApkInfo[];
  kind?: string;
}

export interface DeobfuscationFile {
  symbolType: string;
}

export interface DeobfuscationUploadResponse {
  deobfuscationFile: DeobfuscationFile;
}

export interface ListingsListResponse {
  listings: Listing[];
}

export type ImageType =
  | "phoneScreenshots"
  | "sevenInchScreenshots"
  | "tenInchScreenshots"
  | "tvScreenshots"
  | "wearScreenshots"
  | "icon"
  | "featureGraphic"
  | "tvBanner";

export interface Image {
  id: string;
  url: string;
  sha1: string;
  sha256: string;
}

export interface ImagesListResponse {
  images: Image[];
}

export interface ImageUploadResponse {
  image: Image;
}

export interface ImagesDeleteAllResponse {
  deleted: Image[];
}

export interface CountryAvailability {
  countryTargeting: {
    countries: string[];
    includeRestOfWorld: boolean;
  };
}

// --- Reviews ---

export interface ReviewsListResponse {
  reviews: Review[];
  tokenPagination?: TokenPagination;
}

export interface TokenPagination {
  nextPageToken?: string;
  previousPageToken?: string;
}

export interface ReviewReplyRequest {
  replyText: string;
}

export interface ReviewReplyResponse {
  result: {
    replyText: string;
    lastEdited: { seconds: string };
  };
}

export interface ReviewsListOptions {
  token?: string;
  maxResults?: number;
  startIndex?: number;
  translationLanguage?: string;
}

// --- Reporting API (Vitals) ---

export type VitalsMetricSet =
  | "crashRateMetricSet"
  | "anrRateMetricSet"
  | "excessiveWakeupRateMetricSet"
  | "stuckBackgroundWakelockRateMetricSet"
  | "slowStartRateMetricSet"
  | "slowRenderingRateMetricSet"
  | "errorCountMetricSet";

export type ReportingDimension =
  | "apiLevel"
  | "versionCode"
  | "deviceModel"
  | "deviceType"
  | "countryCode"
  | "deviceRamBucket"
  | "deviceSocName"
  | "deviceCpuMakeModel"
  | "deviceGlEsVersion"
  | "deviceVulkanVersion"
  | "deviceOpenGlVersion"
  | "deviceBrand"
  | "startType";

export type ReportingAggregation = "DAILY" | "HOURLY";

export interface MetricSetQuery {
  metrics: string[];
  dimensions?: ReportingDimension[];
  timelineSpec?: {
    aggregationPeriod: ReportingAggregation;
    startTime?: { year: number; month: number; day: number };
    endTime?: { year: number; month: number; day: number };
  };
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface MetricSetResponse {
  rows: MetricRow[];
  nextPageToken?: string;
}

export interface MetricRow {
  dimensions?: Record<string, { stringValue?: string; int64Value?: string }>;
  metrics: Record<
    string,
    {
      decimalValue?: { value: string };
      decimalValueConfidenceInterval?: {
        lowerBound?: { value: string };
        upperBound?: { value: string };
      };
    }
  >;
  startTime?: { year: number; month: number; day: number };
  endTime?: { year: number; month: number; day: number };
}

export interface Anomaly {
  name: string;
  metricSet: string;
  timelineSpec: { aggregationPeriod: string };
  dimensions: Record<string, { stringValue?: string; int64Value?: string }>[];
  metric: Record<string, { decimalValue?: { value: string } }>;
}

export interface AnomalyDetectionResponse {
  anomalies: Anomaly[];
}

export interface ErrorIssue {
  name: string;
  type: string;
  errorReportCount: string;
  distinctUsers: string;
  cause: string;
  location: string;
  firstAppVersion?: { versionCode: string };
  lastAppVersion?: { versionCode: string };
  firstOsVersion?: { apiLevel: string };
  lastOsVersion?: { apiLevel: string };
}

export interface ErrorIssuesResponse {
  errorIssues: ErrorIssue[];
  nextPageToken?: string;
}

export interface ErrorReport {
  name: string;
  type: string;
  reportText: string;
  issue: string;
  deviceModel?: { deviceId: string; marketName: string; deviceMarketingName: string };
  osVersion?: { apiLevel: string };
  appVersion?: { versionCode: string };
}

export interface ErrorReportsResponse {
  errorReports: ErrorReport[];
  nextPageToken?: string;
}

// --- Monetization ---

export interface Money {
  currencyCode: string;
  units?: string;
  nanos?: number;
}

export interface RegionalBasePlanConfig {
  regionCode: string;
  price: Money;
}

export interface BasePlan {
  basePlanId: string;
  state?: "ACTIVE" | "INACTIVE" | "DRAFT";
  archived?: boolean;
  autoRenewingBasePlanType?: {
    billingPeriodDuration?: string;
    gracePeriodDuration?: string;
    accountHoldDuration?: string;
    prorationMode?: string;
  };
  prepaidBasePlanType?: { billingPeriodDuration?: string };
  regionalConfigs: RegionalBasePlanConfig[];
  offerTags?: { tag: string }[];
}

export interface SubscriptionListing {
  title: string;
  description?: string;
  benefits?: string[];
  languageCode?: string;
}

export interface Subscription {
  productId: string;
  packageName?: string;
  listings?: Record<string, SubscriptionListing>;
  basePlans?: BasePlan[];
  taxAndComplianceSettings?: Record<string, unknown>;
}

export interface SubscriptionsListResponse {
  subscriptions: Subscription[];
  nextPageToken?: string;
}

export interface BasePlanMigratePricesRequest {
  regionalPriceMigrations: {
    regionCode: string;
    oldestAllowedPriceVersionTime?: string;
    priceIncreaseType?: string;
  }[];
  regionsVersion?: { version?: string };
  latencyTolerance?: ProductUpdateLatencyTolerance;
}

export interface BatchMigratePricesRequest {
  requests: {
    packageName: string;
    productId: string;
    basePlanId: string;
    regionalPriceMigrations: {
      regionCode: string;
      oldestAllowedPriceVersionTime?: string;
      priceIncreaseType?: string;
    }[];
    regionsVersion?: { version?: string };
    latencyTolerance?: ProductUpdateLatencyTolerance;
  }[];
}

export interface BatchMigratePricesResponse {
  responses: {
    subscription?: Subscription;
  }[];
}

export interface SubscriptionOfferPhase {
  recurrenceCount: number;
  duration: string;
  regionalConfigs: {
    regionCode: string;
    price?: Money;
    absoluteDiscount?: Money;
    relativeDiscount?: number;
  }[];
}

export interface SubscriptionOffer {
  productId: string;
  basePlanId: string;
  offerId: string;
  state: "ACTIVE" | "INACTIVE" | "DRAFT";
  offerTags?: { tag: string }[];
  phases: SubscriptionOfferPhase[];
  targeting?: Record<string, unknown>;
  regionalConfigs?: {
    regionCode: string;
    newSubscriberAvailability?: boolean;
  }[];
}

export interface OffersListResponse {
  subscriptionOffers: SubscriptionOffer[];
  nextPageToken?: string;
}

export interface InAppProductListing {
  title: string;
  description: string;
  benefits?: string[];
}

export interface InAppProduct {
  sku: string;
  status: string;
  purchaseType: string;
  defaultPrice: Money;
  listings?: Record<string, InAppProductListing>;
  defaultLanguage?: string;
  packageName?: string;
}

export interface InAppProductsListResponse {
  inappproduct: InAppProduct[];
  tokenPagination?: TokenPagination;
}

export interface ProductPurchase {
  purchaseState: number;
  consumptionState: number;
  purchaseTimeMillis: string;
  orderId: string;
  acknowledgementState: number;
  regionCode?: string;
}

export interface SubscriptionPurchaseV2 {
  kind: string;
  regionCode?: string;
  lineItems: SubscriptionPurchaseLineItem[];
  startTime?: string;
  subscriptionState: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  /** Resubscription context when purchase originates from Play Store. (Nov 2025) */
  outOfAppPurchaseContext?: { externalTransactionToken?: string };
  /** Cancellation details: reason, survey result, time. */
  canceledStateContext?: {
    cancelTime?: string;
    cancelSurveyResult?: { reason?: number; reasonUserInput?: string };
    userInitiatedCancellation?: Record<string, unknown>;
    systemInitiatedCancellation?: Record<string, unknown>;
    developerInitiatedCancellation?: Record<string, unknown>;
    replacementCancellation?: Record<string, unknown>;
  };
  testPurchase?: Record<string, unknown>;
  signupPromotion?: { promotionType?: string; promotionCode?: string };
  externalAccountIdentifiers?: {
    externalAccountId?: string;
    obfuscatedExternalAccountId?: string;
    obfuscatedExternalProfileId?: string;
  };
  pausedStateContext?: { autoResumeTime?: string };
  subscribeWithGoogleInfo?: {
    profileName?: string;
    emailAddress?: string;
    givenName?: string;
    familyName?: string;
    profileId?: string;
  };
}

export interface SubscriptionPurchaseLineItem {
  productId: string;
  expiryTime?: string;
  autoRenewingPlan?: {
    autoRenewEnabled?: boolean;
    recurringPrice?: Money;
    priceChangeDetails?: {
      newPrice?: Money;
      priceChangeState?: string;
      expectedNewPriceChargeTime?: string;
    };
    /** Price step-up consent details. (Sep 2025) */
    priceStepUpConsentDetails?: {
      consentStatus?: string;
      lastConsentTime?: string;
    };
  };
  offerDetails?: { basePlanId?: string; offerId?: string; offerTags?: string[] };
  /** Replaces deprecated latestOrderId. (May 2025) */
  latestSuccessfulOrderId?: string;
  /** Details about item being replaced, if applicable. (Nov 2025) */
  itemReplacement?: {
    productId?: string;
    offerDetails?: { basePlanId?: string; offerId?: string };
  };
  /** Current offer phase (union field — exactly one set). (Jan 2026) */
  offerPhase?: {
    basePrice?: Record<string, unknown>;
    freeTrial?: Record<string, unknown>;
    introductoryPrice?: Record<string, unknown>;
    proratedPeriod?: Record<string, unknown>;
  };
}

export interface SubscriptionPurchase {
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  orderId: string;
  paymentState?: number;
  cancelReason?: number;
}

export interface SubscriptionDeferRequest {
  deferralInfo: {
    expectedExpiryTimeMillis: string;
    desiredExpiryTimeMillis: string;
  };
}

export interface SubscriptionDeferResponse {
  newExpiryTimeMillis: string;
}

export interface VoidedPurchase {
  kind?: string;
  purchaseToken: string;
  purchaseTimeMillis: string;
  voidedTimeMillis: string;
  orderId: string;
  voidedSource: number;
  voidedReason: number;
  voidedQuantity?: number;
}

export interface VoidedPurchasesListResponse {
  voidedPurchases: VoidedPurchase[];
  tokenPagination?: TokenPagination;
}

// --- Orders API (May 2025) ---

export interface Order {
  orderId: string;
  state: string;
  purchaseToken?: string;
  createTime?: string;
  lastEventTime?: string;
  total?: Money;
  tax?: Money;
  lineItems?: OrderLineItem[];
  buyerAddress?: { regionCode?: string; postalCode?: string };
  developerRevenueInBuyerCurrency?: Money;
  orderHistory?: {
    processedEvent?: { eventTime?: string };
    cancellationEvent?: { eventTime?: string };
    refundEvent?: {
      eventTime?: string;
      refundDetails?: { tax?: Money; refund?: Money };
      refundReason?: string;
    };
    partialRefundEvents?: Array<{
      createTime?: string;
      processTime?: string;
      state?: string;
      refundDetails?: { tax?: Money; refund?: Money };
    }>;
  };
  /** Offer phase details for prorated periods. (Nov 2025) */
  offerPhaseDetails?: { offerPhase?: string };
}

export interface OrderLineItem {
  productId?: string;
  productType?: string;
  quantity?: number;
  price?: Money;
}

export interface BatchGetOrdersResponse {
  orders: Order[];
}

// --- ProductPurchaseV2 (Jun 2025) ---

export interface ProductPurchaseV2 {
  kind?: string;
  productLineItem?: ProductPurchaseLineItem[];
  purchaseStateContext?: { state?: string };
  orderId?: string;
  regionCode?: string;
  purchaseCompletionTime?: string;
  acknowledgementState?: string;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
  testPurchaseContext?: Record<string, unknown>;
}

export interface ProductPurchaseLineItem {
  productId?: string;
  quantity?: number;
  offerDetails?: { offerId?: string; offerTags?: string[] };
}

// --- SubscriptionsV2 cancel/defer (Sep 2025 / Jan 2026) ---

export interface SubscriptionsV2CancelRequest {
  cancellationType?: string;
}

/**
 * Request body for purchases.subscriptionsv2.revoke.
 * revocationContext is a union — exactly one of fullRefund, proratedRefund,
 * or itemBasedRefund should be set. itemBasedRefund targets a single add-on
 * product by productId. (May 2025)
 */
export interface RevokeSubscriptionV2Request {
  revocationContext?: {
    fullRefund?: Record<string, never>;
    proratedRefund?: Record<string, never>;
    itemBasedRefund?: { productId: string };
  };
}

export interface SubscriptionsV2DeferRequest {
  deferralInfo: {
    desiredExpiryTime: string;
  };
}

export interface SubscriptionsV2DeferResponse {
  newExpiryTime: string;
}

export interface ConvertRegionPricesRequest {
  price: Money;
}

export interface ConvertedRegionPrice {
  regionCode: string;
  price: Money;
  taxAmount: Money;
}

export interface ConvertRegionPricesResponse {
  convertedRegionPrices: Record<string, ConvertedRegionPrice>;
}

// --- Reports ---

export type ReportType =
  | "earnings"
  | "sales"
  | "estimated_sales"
  | "installs"
  | "crashes"
  | "ratings"
  | "reviews"
  | "store_performance"
  | "subscriptions"
  | "play_balance";

export type StatsDimension =
  | "country"
  | "language"
  | "os_version"
  | "device"
  | "app_version"
  | "carrier"
  | "overview";

export interface ReportBucket {
  bucketId: string;
  uri: string;
}

export interface ReportsListResponse {
  reports: ReportBucket[];
}

// --- Users ---

export type DeveloperPermission =
  | "ADMIN"
  | "CAN_MANAGE_PERMISSIONS"
  | "CAN_MANAGE_PUBLIC_APKS"
  | "CAN_MANAGE_TRACK_USERS"
  | "CAN_MANAGE_TRACK_CONFIGURATION"
  | "CAN_VIEW_FINANCIAL_DATA"
  | "CAN_REPLY_TO_REVIEWS"
  | "CAN_MANAGE_PUBLIC_LISTING"
  | "CAN_MANAGE_DRAFT_APPS"
  | "CAN_MANAGE_ORDERS";

export interface Grant {
  packageName: string;
  appLevelPermissions: DeveloperPermission[];
}

export interface User {
  email: string;
  name?: string;
  developerAccountPermission?: DeveloperPermission[];
  grants?: Grant[];
  expirationTime?: string;
}

export interface UsersListResponse {
  users: User[];
  nextPageToken?: string;
}

// --- App Recovery ---

export interface AppRecoveryAction {
  appRecoveryId?: string;
  status?: string;
  targeting?: {
    versionList?: { versionCodes?: string[] };
    regions?: { regionCode?: string[] };
  };
  remoteInAppUpdateData?: {
    remoteInAppUpdateDataPerBundle?: unknown[];
  };
  createTime?: string;
  deployTime?: string;
  cancelTime?: string;
  lastUpdateTime?: string;
}

export interface AppRecoveriesListResponse {
  recoveryActions: AppRecoveryAction[];
}

export interface AppRecoveryTargeting {
  allUsers?: { inScopeVersionCodes?: string[] };
  androidSdks?: { sdkLevels: string[] };
  regions?: { regionCodes: string[] };
  versionList?: { versionCodes: string[] };
}

export interface CreateAppRecoveryActionRequest {
  remoteInAppUpdateData?: Record<string, unknown>;
  appRecoveryAction?: {
    targeting?: AppRecoveryTargeting;
    status?: string;
  };
}

// --- External Transactions ---

export interface ExternalTransactionAmount {
  priceMicros?: string;
  currency?: string;
}

export interface ExternalTransaction {
  externalTransactionId?: string;
  originalPreTaxAmount?: ExternalTransactionAmount;
  originalTaxAmount?: ExternalTransactionAmount;
  currentPreTaxAmount?: ExternalTransactionAmount;
  currentTaxAmount?: ExternalTransactionAmount;
  testPurchase?: Record<string, unknown>;
  transactionTime?: string;
  createTime?: string;
  transactionState?: string;
  userTaxAddress?: { regionCode?: string };
  externalTransactionToken?: string;
  packageName?: string;
  oneTimeTransaction?: { externalTransactionToken?: string };
  recurringTransaction?: {
    externalTransactionId?: string;
    externalSubscription?: { subscriptionType?: string };
  };
}

export interface ExternalTransactionRefund {
  refundTime?: string;
  partialRefund?: {
    refundPreTaxAmount?: ExternalTransactionAmount;
  };
  fullRefund?: Record<string, unknown>;
}

// --- Data Safety ---

export interface DataSafety {
  dataTypes?: DataSafetyDataType[];
  purposes?: DataSafetyPurpose[];
  securityPractices?: {
    dataEncryptedInTransit?: boolean;
    dataDeleteable?: boolean;
    independentSecurityReview?: boolean;
  };
}

export interface DataSafetyDataType {
  dataType?: string;
  dataCategory?: string;
  collected?: boolean;
  shared?: boolean;
  ephemeral?: boolean;
  required?: boolean;
  purposes?: string[];
}

export interface DataSafetyPurpose {
  purpose?: string;
}

// --- Testers ---

export interface Testers {
  googleGroups?: string[];
  googleGroupsCount?: number;
}

// --- Device Tiers ---

export interface DeviceTier {
  deviceTierConfigId: string;
  deviceGroups: DeviceGroup[];
}

export interface DeviceGroup {
  name: string;
  deviceSelectors: DeviceSelector[];
}

export interface DeviceSelector {
  deviceRam?: { minBytes?: string; maxBytes?: string };
  includedDeviceIds?: { buildBrand: string; buildDevice: string }[];
  excludedDeviceIds?: { buildBrand: string; buildDevice: string }[];
  requiredSystemFeatures?: { name: string }[];
  forbiddenSystemFeatures?: { name: string }[];
}

export interface DeviceTierConfig {
  deviceTierConfigId: string;
  deviceGroups: DeviceGroup[];
  userCountryTargeting?: { countryCodes: string[]; exclude?: boolean };
}

export interface DeviceTierConfigsListResponse {
  deviceTierConfigs: DeviceTierConfig[];
}

// --- Internal App Sharing ---

export interface InternalAppSharingArtifact {
  certificateFingerprint: string;
  downloadUrl: string;
  sha256: string;
}

// --- Generated APKs ---

export interface GeneratedApk {
  generatedApkId: string;
  variantId: number;
  moduleName: string;
  apkDescription?: string;
  certificateSha256Fingerprint: string;
}

export interface GeneratedApksPerVersion {
  generatedApks: GeneratedApk[];
}

// --- Externally Hosted APKs ---

export interface ExternallyHostedApk {
  applicationLabel: string;
  externallyHostedUrl: string;
  fileSha256Base64: string;
  fileSize: string;
  iconBase64?: string;
  certificateBase64s: string[];
  maximumSdk?: number;
  minimumSdk: number;
  nativeCodes?: string[];
  packageName: string;
  usesFeatures?: string[];
  usesPermissions?: { name: string; maxSdkVersion?: number }[];
  versionCode: number;
  versionName: string;
}

export interface ExternallyHostedApkResponse {
  externallyHostedApk: ExternallyHostedApk;
}

// --- One-Time Products (OTP) ---

export interface OneTimeProduct {
  packageName: string;
  productId: string;
  purchaseType: "managedUser" | "subscription";
  listings: Record<string, OneTimeProductListing>;
  taxAndComplianceSettings?: TaxAndComplianceSettings;
}

export interface OneTimeProductListing {
  title: string;
  description?: string;
  benefits?: string[];
}

export interface TaxAndComplianceSettings {
  eeaWithdrawalRightType?: "WITHDRAWAL_RIGHT_DIGITAL_CONTENT" | "WITHDRAWAL_RIGHT_SERVICE";
  taxRateInfoByRegionCode?: Record<string, { streamingTaxType?: string; taxTier?: string }>;
  isTokenizedDigitalAsset?: boolean;
}

export interface OneTimeOffer {
  packageName: string;
  productId: string;
  purchaseOptionId: string;
  offerId: string;
  state?: "DRAFT" | "ACTIVE" | "CANCELLED" | "INACTIVE";
  regionalPricingAndAvailabilityConfigs?: Record<string, OneTimeOfferRegionalConfig>;
  /** @deprecated Use regionalPricingAndAvailabilityConfigs instead */
  regionalConfigs?: Record<string, OneTimeOfferRegionalConfig>;
  otherRegionsConfig?: { usdPrice: { units: string; nanos?: number } };
  offerTags?: Array<{ tag: string }>;
  regionsVersion?: { version: string };
  preOrderOffer?: Record<string, unknown>;
  discountedOffer?: Record<string, unknown>;
}

export interface OneTimeOfferRegionalConfig {
  price: { currencyCode: string; units: string; nanos?: number };
  newSubscriberAvailability?: boolean;
}

export interface OneTimeProductsListResponse {
  oneTimeProducts: OneTimeProduct[];
  nextPageToken?: string;
}

export interface OneTimeOffersListResponse {
  oneTimeProductOffers?: OneTimeOffer[];
  /** @deprecated Use oneTimeProductOffers */
  oneTimeOffers?: OneTimeOffer[];
  nextPageToken?: string;
}

// --- Purchase Options (removed: standalone /purchaseOptions/ resource does not exist in API) ---
// Purchase options are managed through /oneTimeProducts/{id}/purchaseOptions/ paths.
// See oneTimeProducts methods for the correct API surface.

// --- System APKs ---

export interface SystemApkDeviceSpec {
  supportedAbis?: string[];
  supportedLocales?: string[];
  screenDensity?: number;
}

export interface SystemApkOptions {
  uncompressedNativeLibraries?: boolean;
  uncompressedDexFiles?: boolean;
  rotated?: boolean;
}

export interface SystemApkVariant {
  variantId?: number;
  deviceSpec?: SystemApkDeviceSpec;
  options?: SystemApkOptions;
}

// --- IAP Batch Operations ---

export interface InAppProductsBatchUpdateRequest {
  requests: { inappproduct: InAppProduct; packageName: string; sku: string }[];
}

export interface InAppProductsBatchUpdateResponse {
  inappproducts: InAppProduct[];
}

export interface InAppProductsBatchGetRequest {
  packageName: string;
  sku: string[];
}

// --- Resumable Upload ---

export interface UploadProgressEvent {
  /** Bytes uploaded so far */
  bytesUploaded: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Percentage 0-100 */
  percent: number;
  /** Bytes per second throughput */
  bytesPerSecond: number;
  /** Estimated seconds remaining */
  etaSeconds: number;
}

export interface ResumableUploadOptions {
  /** Chunk size in bytes. Must be a multiple of 256 KB. Default: 8 MB */
  chunkSize?: number;
  /** Progress callback fired after each chunk */
  onProgress?: (event: UploadProgressEvent) => void;
  /** Existing session URI to resume a previous upload */
  resumeSessionUri?: string;
  /** Maximum resume attempts per chunk before giving up. Default: 5 */
  maxResumeAttempts?: number;
}

// --- Release Lifecycle (applications.tracks.releases) ---

export interface ReleaseSummary {
  releaseName?: string;
  track: string;
  activeArtifacts?: { versionCode: number }[];
  releaseLifecycleState?:
    | "RELEASE_LIFECYCLE_STATE_UNSPECIFIED"
    | "DRAFT"
    | "NOT_SENT_FOR_REVIEW"
    | "IN_REVIEW"
    | "APPROVED_NOT_PUBLISHED"
    | "NOT_APPROVED"
    | "PUBLISHED";
}

export interface ReleasesListResponse {
  releases: ReleaseSummary[];
  nextPageToken?: string;
}

// --- Subscription Batch Operations ---

export interface SubscriptionsBatchGetRequest {
  productIds: string[];
}

export interface SubscriptionsBatchGetResponse {
  subscriptions: Subscription[];
}

export interface SubscriptionsBatchUpdateRequest {
  requests: {
    subscription: Subscription;
    updateMask?: string;
    regionsVersion?: { version?: string };
    allowMissing?: boolean;
    latencyTolerance?: string;
  }[];
}

export interface SubscriptionsBatchUpdateResponse {
  subscriptions: Subscription[];
}

// --- IAP Batch Delete ---

export interface InAppProductsBatchDeleteRequest {
  requests: { packageName: string; sku: string; latencyTolerance?: string }[];
}
