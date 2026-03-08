export interface ApiClientOptions {
  auth: {
    getAccessToken(): Promise<string>;
  };
  maxRetries?: number;
  timeout?: number;
  baseDelay?: number;
  maxDelay?: number;
  rateLimitPerSecond?: number;
  baseUrl?: string;
  rateLimiter?: import("./rate-limiter.js").RateLimiter;
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
  translationLanguage?: string;
}

// --- Reporting API (Vitals) ---

export type VitalsMetricSet =
  | "vitals.crashrate"
  | "vitals.anrrate"
  | "vitals.excessivewakeuprate"
  | "vitals.stuckbackgroundwakelockrate"
  | "vitals.slowstartrate"
  | "vitals.slowrenderingrate"
  | "vitals.errors.counts";

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
  | "deviceBrand";

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
  metrics: Record<string, { decimalValue?: { value: string }; decimalValueConfidenceInterval?: { lowerBound?: { value: string }; upperBound?: { value: string } } }>;
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
  state: "ACTIVE" | "INACTIVE" | "DRAFT";
  autoRenewingBasePlanType?: { billingPeriodDuration?: string; gracePeriodDuration?: string };
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
}

export interface SubscriptionPurchaseLineItem {
  productId: string;
  expiryTime?: string;
  autoRenewingPlan?: { autoRenewEnabled?: boolean };
  offerDetails?: { basePlanId?: string; offerId?: string; offerTags?: string[] };
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
  purchaseToken: string;
  purchaseTimeMillis: string;
  voidedTimeMillis: string;
  orderId: string;
  voidedSource: number;
  voidedReason: number;
}

export interface VoidedPurchasesListResponse {
  voidedPurchases: VoidedPurchase[];
  tokenPagination?: TokenPagination;
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

// --- Testers ---

export interface Testers {
  googleGroups?: string[];
  googleGroupsCount?: number;
}
