export interface ApiClientOptions {
  auth: {
    getAccessToken(): Promise<string>;
  };
  maxRetries?: number;
  timeout?: number;
  baseDelay?: number;
  maxDelay?: number;
  rateLimitPerSecond?: number;
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
