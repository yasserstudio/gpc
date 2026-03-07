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
