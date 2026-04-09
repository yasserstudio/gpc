import { PlayApiError } from "./errors.js";
import { createHttpClient } from "./http.js";
import type { RateLimiter } from "./rate-limiter.js";
import { resolveBucket, createRateLimiter } from "./rate-limiter.js";
import type {
  ApiClientOptions,
  ApkInfo,
  ApksListResponse,
  AppDetails,
  AppEdit,
  AppRecoveriesListResponse,
  AppRecoveryAction,
  AppRecoveryTargeting,
  CreateAppRecoveryActionRequest,
  BasePlanMigratePricesRequest,
  BatchMigratePricesRequest,
  BatchMigratePricesResponse,
  Bundle,
  BundleListResponse,
  ConvertRegionPricesRequest,
  ConvertRegionPricesResponse,
  CountryAvailability,
  DataSafety,
  DeobfuscationFile,
  DeobfuscationFileType,
  DeobfuscationUploadResponse,
  DeviceTierConfig,
  DeviceTierConfigsListResponse,
  EditCommitOptions,
  ExpansionFile,
  ExpansionFileType,
  ExternalTransaction,
  MutationOptions,
  ExternalTransactionRefund,
  ExternallyHostedApk,
  ExternallyHostedApkResponse,
  Image,
  ImageType,
  ImageUploadResponse,
  ImagesDeleteAllResponse,
  ImagesListResponse,
  InAppProduct,
  InAppProductsListResponse,
  Listing,
  ListingsListResponse,
  OffersListResponse,
  ProductPurchase,
  Release,
  ReportsListResponse,
  ReportType,
  Review,
  ReviewReplyRequest,
  ReviewReplyResponse,
  ReviewsListOptions,
  ReviewsListResponse,
  Subscription,
  SubscriptionDeferRequest,
  SubscriptionDeferResponse,
  SubscriptionOffer,
  SubscriptionPurchase,
  SubscriptionPurchaseV2,
  SubscriptionsListResponse,
  Testers,
  Track,
  TrackListResponse,
  VoidedPurchasesListResponse,
  OneTimeProduct,
  OneTimeProductsListResponse,
  OneTimeOffer,
  OneTimeOffersListResponse,
  InternalAppSharingArtifact,
  GeneratedApk,
  GeneratedApksPerVersion,
  SystemApkVariant,
  InAppProductsBatchUpdateRequest,
  InAppProductsBatchUpdateResponse,
  ResumableUploadOptions,
  Order,
  BatchGetOrdersResponse,
  ProductPurchaseV2,
  AcknowledgeSubscriptionRequest,
  RevokeSubscriptionV2Request,
  SubscriptionsV2CancelRequest,
  SubscriptionsV2DeferRequest,
  SubscriptionsV2DeferResponse,
  ReleaseSummary,
  ReleasesListResponse,
  SubscriptionsBatchGetResponse,
  SubscriptionsBatchUpdateRequest,
  SubscriptionsBatchUpdateResponse,
} from "./types.js";

export interface PlayApiClient {
  edits: {
    insert(packageName: string): Promise<AppEdit>;
    get(packageName: string, editId: string): Promise<AppEdit>;
    validate(packageName: string, editId: string): Promise<AppEdit>;
    commit(packageName: string, editId: string, options?: EditCommitOptions): Promise<AppEdit>;
    delete(packageName: string, editId: string): Promise<void>;
  };

  details: {
    get(packageName: string, editId: string): Promise<AppDetails>;
    update(packageName: string, editId: string, details: Partial<AppDetails>): Promise<AppDetails>;
    patch(packageName: string, editId: string, partial: Partial<AppDetails>): Promise<AppDetails>;
  };

  bundles: {
    list(packageName: string, editId: string): Promise<Bundle[]>;
    upload(
      packageName: string,
      editId: string,
      filePath: string,
      uploadOptions?: ResumableUploadOptions,
      deviceTierConfigId?: string,
    ): Promise<Bundle>;
  };

  tracks: {
    list(packageName: string, editId: string): Promise<Track[]>;
    get(packageName: string, editId: string, track: string): Promise<Track>;
    create(packageName: string, editId: string, trackName: string): Promise<Track>;
    update(packageName: string, editId: string, track: string, release: Release): Promise<Track>;
    patch(packageName: string, editId: string, track: string, release: Release): Promise<Track>;
  };

  releases: {
    list(packageName: string, track: string): Promise<ReleaseSummary[]>;
  };

  apks: {
    list(packageName: string, editId: string): Promise<ApkInfo[]>;
    upload(
      packageName: string,
      editId: string,
      filePath: string,
      uploadOptions?: ResumableUploadOptions,
    ): Promise<ApkInfo>;
    addExternallyHosted(
      packageName: string,
      editId: string,
      data: ExternallyHostedApk,
    ): Promise<ExternallyHostedApkResponse>;
  };

  listings: {
    list(packageName: string, editId: string): Promise<Listing[]>;
    get(packageName: string, editId: string, language: string): Promise<Listing>;
    update(
      packageName: string,
      editId: string,
      language: string,
      listing: Omit<Listing, "language">,
    ): Promise<Listing>;
    patch(
      packageName: string,
      editId: string,
      language: string,
      partial: Partial<Omit<Listing, "language">>,
    ): Promise<Listing>;
    delete(packageName: string, editId: string, language: string): Promise<void>;
    deleteAll(packageName: string, editId: string): Promise<void>;
  };

  images: {
    list(
      packageName: string,
      editId: string,
      language: string,
      imageType: ImageType,
    ): Promise<Image[]>;
    upload(
      packageName: string,
      editId: string,
      language: string,
      imageType: ImageType,
      filePath: string,
    ): Promise<Image>;
    delete(
      packageName: string,
      editId: string,
      language: string,
      imageType: ImageType,
      imageId: string,
    ): Promise<void>;
    deleteAll(
      packageName: string,
      editId: string,
      language: string,
      imageType: ImageType,
    ): Promise<Image[]>;
  };

  expansionFiles: {
    get(
      packageName: string,
      editId: string,
      apkVersionCode: number,
      expansionFileType: ExpansionFileType,
    ): Promise<ExpansionFile>;
    update(
      packageName: string,
      editId: string,
      apkVersionCode: number,
      expansionFileType: ExpansionFileType,
      data: ExpansionFile,
    ): Promise<ExpansionFile>;
    patch(
      packageName: string,
      editId: string,
      apkVersionCode: number,
      expansionFileType: ExpansionFileType,
      data: Partial<ExpansionFile>,
    ): Promise<ExpansionFile>;
    upload(
      packageName: string,
      editId: string,
      apkVersionCode: number,
      expansionFileType: ExpansionFileType,
      filePath: string,
    ): Promise<ExpansionFile>;
  };

  countryAvailability: {
    get(packageName: string, editId: string, track: string): Promise<CountryAvailability>;
  };

  dataSafety: {
    get(packageName: string): Promise<DataSafety>;
    update(packageName: string, data: DataSafety): Promise<DataSafety>;
  };

  reviews: {
    list(packageName: string, options?: ReviewsListOptions): Promise<ReviewsListResponse>;
    get(packageName: string, reviewId: string, translationLanguage?: string): Promise<Review>;
    reply(packageName: string, reviewId: string, replyText: string): Promise<ReviewReplyResponse>;
  };

  subscriptions: {
    list(
      packageName: string,
      options?: { pageToken?: string; pageSize?: number },
    ): Promise<SubscriptionsListResponse>;
    get(packageName: string, productId: string): Promise<Subscription>;
    create(
      packageName: string,
      data: Subscription,
      productId?: string,
      regionsVersion?: string,
    ): Promise<Subscription>;
    update(
      packageName: string,
      productId: string,
      data: Subscription,
      updateMask?: string,
      regionsVersion?: string,
      options?: MutationOptions,
    ): Promise<Subscription>;
    delete(packageName: string, productId: string): Promise<void>;
    batchGet(packageName: string, productIds: string[]): Promise<Subscription[]>;
    batchUpdate(
      packageName: string,
      requests: SubscriptionsBatchUpdateRequest,
    ): Promise<SubscriptionsBatchUpdateResponse>;
    activateBasePlan(
      packageName: string,
      productId: string,
      basePlanId: string,
    ): Promise<Subscription>;
    deactivateBasePlan(
      packageName: string,
      productId: string,
      basePlanId: string,
    ): Promise<Subscription>;
    deleteBasePlan(packageName: string, productId: string, basePlanId: string): Promise<void>;
    migratePrices(
      packageName: string,
      productId: string,
      basePlanId: string,
      body: BasePlanMigratePricesRequest,
    ): Promise<Subscription>;
    batchMigratePrices(
      packageName: string,
      productId: string,
      body: BatchMigratePricesRequest,
    ): Promise<BatchMigratePricesResponse>;
    listOffers(
      packageName: string,
      productId: string,
      basePlanId: string,
    ): Promise<OffersListResponse>;
    getOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
    ): Promise<SubscriptionOffer>;
    createOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      data: SubscriptionOffer,
      offerId?: string,
      regionsVersion?: string,
    ): Promise<SubscriptionOffer>;
    updateOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
      data: SubscriptionOffer,
      updateMask?: string,
      regionsVersion?: string,
      options?: MutationOptions,
    ): Promise<SubscriptionOffer>;
    deleteOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
    ): Promise<void>;
    activateOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
    ): Promise<SubscriptionOffer>;
    deactivateOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
    ): Promise<SubscriptionOffer>;
    batchUpdateBasePlanStates(
      packageName: string,
      productId: string,
      requests: {
        requests: Array<{
          activateBasePlanRequest?: { basePlanId: string };
          deactivateBasePlanRequest?: { basePlanId: string };
        }>;
      },
    ): Promise<Subscription>;
    batchGetOffers(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerIds: string[],
    ): Promise<{ subscriptionOffers: SubscriptionOffer[] }>;
    batchUpdateOffers(
      packageName: string,
      productId: string,
      basePlanId: string,
      requests: {
        requests: Array<{
          subscriptionOffer: Partial<SubscriptionOffer>;
          updateMask?: string;
          regionsVersion?: string;
        }>;
      },
    ): Promise<{ subscriptionOffers: SubscriptionOffer[] }>;
    batchUpdateOfferStates(
      packageName: string,
      productId: string,
      basePlanId: string,
      requests: {
        requests: Array<{
          activateSubscriptionOfferRequest?: { offerId: string };
          deactivateSubscriptionOfferRequest?: { offerId: string };
        }>;
      },
    ): Promise<Subscription>;
  };

  inappproducts: {
    list(
      packageName: string,
      options?: { token?: string; maxResults?: number },
    ): Promise<InAppProductsListResponse>;
    get(packageName: string, sku: string): Promise<InAppProduct>;
    create(
      packageName: string,
      data: InAppProduct,
      options?: { autoConvertMissingPrices?: boolean },
    ): Promise<InAppProduct>;
    update(
      packageName: string,
      sku: string,
      data: InAppProduct,
      options?: { autoConvertMissingPrices?: boolean; allowMissing?: boolean },
    ): Promise<InAppProduct>;
    patch(
      packageName: string,
      sku: string,
      data: Partial<InAppProduct>,
      options?: { autoConvertMissingPrices?: boolean; latencyTolerance?: string },
    ): Promise<InAppProduct>;
    delete(packageName: string, sku: string): Promise<void>;
    batchUpdate(
      packageName: string,
      requests: InAppProductsBatchUpdateRequest,
    ): Promise<InAppProductsBatchUpdateResponse>;
    batchGet(packageName: string, skus: string[]): Promise<InAppProduct[]>;
    batchDelete(packageName: string, skus: string[]): Promise<void>;
  };

  purchases: {
    getProduct(packageName: string, productId: string, token: string): Promise<ProductPurchase>;
    acknowledgeProduct(
      packageName: string,
      productId: string,
      token: string,
      body?: { developerPayload?: string },
    ): Promise<void>;
    consumeProduct(packageName: string, productId: string, token: string): Promise<void>;
    getSubscriptionV2(packageName: string, token: string): Promise<SubscriptionPurchaseV2>;
    getSubscriptionV1(
      packageName: string,
      subscriptionId: string,
      token: string,
    ): Promise<SubscriptionPurchase>;
    cancelSubscription(packageName: string, subscriptionId: string, token: string): Promise<void>;
    deferSubscription(
      packageName: string,
      subscriptionId: string,
      token: string,
      body: SubscriptionDeferRequest,
    ): Promise<SubscriptionDeferResponse>;
    acknowledgeSubscription(
      packageName: string,
      subscriptionId: string,
      token: string,
      body?: AcknowledgeSubscriptionRequest,
    ): Promise<void>;
    revokeSubscriptionV2(
      packageName: string,
      token: string,
      body?: RevokeSubscriptionV2Request,
    ): Promise<void>;
    // refundSubscriptionV2 removed: endpoint does not exist in official API.
    // Use orders.refund or revokeSubscriptionV2 with revocationContext instead.
    /** V2 cancel with cancellationType support. (Sep 2025) */
    cancelSubscriptionV2(
      packageName: string,
      token: string,
      body?: SubscriptionsV2CancelRequest,
    ): Promise<void>;
    /** V2 defer for subscriptions with add-ons. (Jan 2026) */
    deferSubscriptionV2(
      packageName: string,
      token: string,
      body: SubscriptionsV2DeferRequest,
    ): Promise<SubscriptionsV2DeferResponse>;
    /** V2 product purchase details for multi-offer OTPs. (Jun 2025) */
    getProductV2(packageName: string, token: string): Promise<ProductPurchaseV2>;
    listVoided(
      packageName: string,
      options?: {
        startTime?: string;
        endTime?: string;
        type?: number;
        includeQuantityBasedPartialRefund?: boolean;
        maxResults?: number;
        token?: string;
      },
    ): Promise<VoidedPurchasesListResponse>;
  };

  orders: {
    get(packageName: string, orderId: string): Promise<Order>;
    batchGet(packageName: string, orderIds: string[]): Promise<Order[]>;
    refund(
      packageName: string,
      orderId: string,
      body?: { fullRefund?: boolean; proratedRefund?: boolean; revoke?: boolean },
    ): Promise<void>;
  };

  monetization: {
    convertRegionPrices(
      packageName: string,
      price: ConvertRegionPricesRequest,
    ): Promise<ConvertRegionPricesResponse>;
  };

  reports: {
    list(
      packageName: string,
      reportType: ReportType,
      year: number,
      month: number,
    ): Promise<ReportsListResponse>;
  };

  testers: {
    get(packageName: string, editId: string, track: string): Promise<Testers>;
    update(packageName: string, editId: string, track: string, testers: Testers): Promise<Testers>;
    patch(
      packageName: string,
      editId: string,
      track: string,
      testers: Partial<Testers>,
    ): Promise<Testers>;
  };

  deobfuscation: {
    upload(
      packageName: string,
      editId: string,
      versionCode: number,
      filePath: string,
      fileType?: DeobfuscationFileType,
    ): Promise<DeobfuscationFile>;
  };

  appRecovery: {
    list(packageName: string, versionCode?: number): Promise<AppRecoveryAction[]>;
    cancel(packageName: string, appRecoveryId: string): Promise<void>;
    deploy(packageName: string, appRecoveryId: string): Promise<void>;
    create(
      packageName: string,
      request: CreateAppRecoveryActionRequest,
    ): Promise<AppRecoveryAction>;
    addTargeting(
      packageName: string,
      appRecoveryId: string,
      targeting: AppRecoveryTargeting,
    ): Promise<AppRecoveryAction>;
  };

  externalTransactions: {
    create(packageName: string, data: ExternalTransaction): Promise<ExternalTransaction>;
    get(packageName: string, transactionId: string): Promise<ExternalTransaction>;
    refund(
      packageName: string,
      transactionId: string,
      refundData: ExternalTransactionRefund,
    ): Promise<ExternalTransaction>;
  };

  deviceTiers: {
    list(packageName: string): Promise<DeviceTierConfig[]>;
    get(packageName: string, configId: string): Promise<DeviceTierConfig>;
    create(packageName: string, config: DeviceTierConfig): Promise<DeviceTierConfig>;
  };

  oneTimeProducts: {
    list(
      packageName: string,
      options?: { pageToken?: string; pageSize?: number },
    ): Promise<OneTimeProductsListResponse>;
    get(packageName: string, productId: string): Promise<OneTimeProduct>;
    create(
      packageName: string,
      product: OneTimeProduct,
      regionsVersion?: string,
    ): Promise<OneTimeProduct>;
    update(
      packageName: string,
      productId: string,
      product: Partial<OneTimeProduct>,
      updateMask?: string,
      regionsVersion?: string,
      options?: MutationOptions,
    ): Promise<OneTimeProduct>;
    delete(packageName: string, productId: string): Promise<void>;
    listOffers(
      packageName: string,
      productId: string,
      purchaseOptionId?: string,
    ): Promise<OneTimeOffersListResponse>;
    getOffer(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      offerId: string,
    ): Promise<OneTimeOffer>;
    createOffer(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      offer: OneTimeOffer,
      regionsVersion?: string,
    ): Promise<OneTimeOffer>;
    updateOffer(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      offerId: string,
      offer: Partial<OneTimeOffer>,
      updateMask?: string,
      regionsVersion?: string,
      options?: MutationOptions,
    ): Promise<OneTimeOffer>;
    deleteOffer(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      offerId: string,
    ): Promise<void>;
    batchGet(packageName: string, productIds: string[]): Promise<OneTimeProduct[]>;
    batchUpdate(
      packageName: string,
      requests: {
        requests: Array<{
          oneTimeProduct: Partial<OneTimeProduct>;
          updateMask?: string;
          regionsVersion?: string;
        }>;
      },
    ): Promise<{ oneTimeProducts: OneTimeProduct[] }>;
    batchDelete(packageName: string, productIds: string[]): Promise<void>;

    // Purchase option batch operations
    batchDeletePurchaseOptions(
      packageName: string,
      productId: string,
      requests: Array<{
        packageName: string;
        productId: string;
        purchaseOptionId: string;
        force?: boolean;
        latencyTolerance?: string;
      }>,
    ): Promise<void>;
    batchUpdatePurchaseOptionStates(
      packageName: string,
      productId: string,
      requests: Array<{
        activatePurchaseOptionRequest?: {
          packageName: string;
          productId: string;
          purchaseOptionId: string;
          latencyTolerance?: string;
        };
        deactivatePurchaseOptionRequest?: {
          packageName: string;
          productId: string;
          purchaseOptionId: string;
          latencyTolerance?: string;
        };
      }>,
    ): Promise<{ oneTimeProducts: OneTimeProduct[] }>;

    // Offer batch operations
    cancelOffer(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      offerId: string,
      latencyTolerance?: string,
    ): Promise<OneTimeOffer>;
    batchGetOffers(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      requests: Array<{
        packageName: string;
        productId: string;
        purchaseOptionId: string;
        offerId: string;
      }>,
    ): Promise<{ oneTimeProductOffers: OneTimeOffer[] }>;
    batchUpdateOffers(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      requests: Array<{
        oneTimeProductOffer: Partial<OneTimeOffer>;
        updateMask?: string;
        regionsVersion?: { version: string };
        allowMissing?: boolean;
        latencyTolerance?: string;
      }>,
    ): Promise<{ oneTimeProductOffers: OneTimeOffer[] }>;
    batchUpdateOfferStates(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      requests: Array<{
        activateOneTimeProductOfferRequest?: Record<string, unknown>;
        deactivateOneTimeProductOfferRequest?: Record<string, unknown>;
        cancelOneTimeProductOfferRequest?: Record<string, unknown>;
      }>,
    ): Promise<{ oneTimeProductOffers: OneTimeOffer[] }>;
    batchDeleteOffers(
      packageName: string,
      productId: string,
      purchaseOptionId: string,
      requests: Array<{
        packageName: string;
        productId: string;
        purchaseOptionId: string;
        offerId: string;
        latencyTolerance?: string;
      }>,
    ): Promise<void>;
  };

  internalAppSharing: {
    uploadBundle(packageName: string, bundlePath: string): Promise<InternalAppSharingArtifact>;
    uploadApk(packageName: string, apkPath: string): Promise<InternalAppSharingArtifact>;
  };

  generatedApks: {
    list(packageName: string, versionCode: number): Promise<GeneratedApk[]>;
    download(packageName: string, versionCode: number, id: string): Promise<ArrayBuffer>;
  };

  systemApks: {
    create(
      packageName: string,
      versionCode: number,
      variant: SystemApkVariant,
    ): Promise<SystemApkVariant>;
    list(packageName: string, versionCode: number): Promise<{ variants: SystemApkVariant[] }>;
    get(packageName: string, versionCode: number, variantId: number): Promise<SystemApkVariant>;
    download(packageName: string, versionCode: number, variantId: number): Promise<ArrayBuffer>;
  };
}

const DEFAULT_REGIONS_VERSION = "2022/02";

function applyMutationOptions(params: Record<string, string>, options?: MutationOptions): void {
  if (options?.allowMissing) params["allowMissing"] = "true";
  if (options?.latencyTolerance) params["latencyTolerance"] = options.latencyTolerance;
}

async function autoRateLimit(limiter: RateLimiter | undefined, path: string): Promise<void> {
  if (!limiter) return;
  const bucket = resolveBucket(path);
  await limiter.acquire(bucket);
}

export function createApiClient(options: ApiClientOptions): PlayApiClient {
  const rawHttp = createHttpClient(options);
  const defaultLimiter = createRateLimiter();
  const limiter = options.rateLimiter || defaultLimiter;

  // Wrap HTTP methods with automatic rate limiting based on path
  const http = {
    ...rawHttp,
    async get<T>(path: string, params?: Record<string, string>) {
      await autoRateLimit(limiter, path);
      return rawHttp.get<T>(path, params);
    },
    async post<T>(path: string, body?: unknown) {
      await autoRateLimit(limiter, path);
      return rawHttp.post<T>(path, body);
    },
    async put<T>(path: string, body?: unknown) {
      await autoRateLimit(limiter, path);
      return rawHttp.put<T>(path, body);
    },
    async patch<T>(path: string, body?: unknown) {
      await autoRateLimit(limiter, path);
      return rawHttp.patch<T>(path, body);
    },
    async delete<T>(path: string) {
      await autoRateLimit(limiter, path);
      return rawHttp.delete<T>(path);
    },
  };

  return {
    edits: {
      async insert(packageName) {
        const { data } = await http.post<AppEdit>(`/${packageName}/edits`);
        return data;
      },

      async get(packageName, editId) {
        const { data } = await http.get<AppEdit>(`/${packageName}/edits/${editId}`);
        return data;
      },

      async validate(packageName, editId) {
        const { data } = await http.post<AppEdit>(`/${packageName}/edits/${editId}:validate`);
        return data;
      },

      async commit(packageName, editId, options?) {
        let path = `/${packageName}/edits/${editId}:commit`;
        if (options?.changesNotSentForReview || options?.changesInReviewBehavior) {
          const params = new URLSearchParams();
          if (options.changesNotSentForReview) params.set("changesNotSentForReview", "true");
          if (options.changesInReviewBehavior)
            params.set("changesInReviewBehavior", options.changesInReviewBehavior);
          path += `?${params.toString()}`;
        }
        const { data } = await http.post<AppEdit>(path);
        return data;
      },

      async delete(packageName, editId) {
        await http.delete(`/${packageName}/edits/${editId}`);
      },
    },

    details: {
      async get(packageName, editId) {
        const { data } = await http.get<AppDetails>(`/${packageName}/edits/${editId}/details`);
        return data;
      },

      async update(packageName, editId, details) {
        const { data } = await http.put<AppDetails>(
          `/${packageName}/edits/${editId}/details`,
          details,
        );
        return data;
      },

      async patch(packageName, editId, partial) {
        const { data } = await http.patch<AppDetails>(
          `/${packageName}/edits/${editId}/details`,
          partial,
        );
        return data;
      },
    },

    bundles: {
      async list(packageName, editId) {
        const { data } = await http.get<BundleListResponse>(
          `/${packageName}/edits/${editId}/bundles`,
        );
        return data.bundles;
      },

      async upload(packageName, editId, filePath, uploadOptions?, deviceTierConfigId?) {
        let bundlePath = `/${packageName}/edits/${editId}/bundles`;
        if (deviceTierConfigId) {
          bundlePath += `?${new URLSearchParams({ deviceTierConfigId }).toString()}`;
        }
        const { data } = await http.uploadResumable<Bundle>(
          bundlePath,
          filePath,
          "application/octet-stream",
          uploadOptions,
        );
        if (!data || !data.versionCode) {
          throw new PlayApiError(
            "Upload succeeded but no bundle data returned",
            "API_EMPTY_RESPONSE",
            200,
            "This is unexpected. Retry the upload or contact Google Play support if the issue persists.",
          );
        }
        return data;
      },
    },

    tracks: {
      async list(packageName, editId) {
        const { data } = await http.get<TrackListResponse>(
          `/${packageName}/edits/${editId}/tracks`,
        );
        return data.tracks;
      },

      async get(packageName, editId, track) {
        const { data } = await http.get<Track>(`/${packageName}/edits/${editId}/tracks/${track}`);
        return data;
      },

      async create(packageName, editId, trackName) {
        const { data } = await http.post<Track>(`/${packageName}/edits/${editId}/tracks`, {
          track: trackName,
        });
        return data;
      },

      async update(packageName, editId, track, release) {
        const { data } = await http.put<Track>(`/${packageName}/edits/${editId}/tracks/${track}`, {
          track,
          releases: [release],
        });
        return data;
      },

      async patch(packageName, editId, track, release) {
        const { data } = await http.patch<Track>(
          `/${packageName}/edits/${editId}/tracks/${track}`,
          {
            track,
            releases: [release],
          },
        );
        return data;
      },
    },

    releases: {
      async list(packageName, track) {
        const { data } = await http.get<ReleasesListResponse>(
          `/${packageName}/tracks/${track}/releases`,
        );
        return data.releases ?? [];
      },
    },

    apks: {
      async list(packageName, editId) {
        const { data } = await http.get<ApksListResponse>(`/${packageName}/edits/${editId}/apks`);
        return data.apks || [];
      },

      async upload(packageName, editId, filePath, uploadOptions) {
        const { data } = await http.uploadResumable<ApkInfo>(
          `/${packageName}/edits/${editId}/apks`,
          filePath,
          "application/vnd.android.package-archive",
          uploadOptions,
        );
        if (!data || !data.versionCode) {
          throw new PlayApiError(
            "Upload succeeded but no APK data returned",
            "API_EMPTY_RESPONSE",
            200,
            "This is unexpected. Retry the upload or contact Google Play support if the issue persists.",
          );
        }
        return data;
      },

      async addExternallyHosted(packageName, editId, apkData) {
        const { data } = await http.post<ExternallyHostedApkResponse>(
          `/${packageName}/edits/${editId}/apks/externallyHosted`,
          { externallyHostedApk: apkData },
        );
        return data;
      },
    },

    listings: {
      async list(packageName, editId) {
        const { data } = await http.get<ListingsListResponse>(
          `/${packageName}/edits/${editId}/listings`,
        );
        return data.listings || [];
      },

      async get(packageName, editId, language) {
        const { data } = await http.get<Listing>(
          `/${packageName}/edits/${editId}/listings/${language}`,
        );
        return data;
      },

      async update(packageName, editId, language, listing) {
        const { data } = await http.put<Listing>(
          `/${packageName}/edits/${editId}/listings/${language}`,
          listing,
        );
        return data;
      },

      async patch(packageName, editId, language, partial) {
        const { data } = await http.patch<Listing>(
          `/${packageName}/edits/${editId}/listings/${language}`,
          partial,
        );
        return data;
      },

      async delete(packageName, editId, language) {
        await http.delete(`/${packageName}/edits/${editId}/listings/${language}`);
      },

      async deleteAll(packageName, editId) {
        await http.delete(`/${packageName}/edits/${editId}/listings`);
      },
    },

    images: {
      async list(packageName, editId, language, imageType) {
        const { data } = await http.get<ImagesListResponse>(
          `/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
        );
        return data.images || [];
      },

      async upload(packageName, editId, language, imageType, filePath) {
        const { data } = await http.upload<ImageUploadResponse>(
          `/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
          filePath,
          filePath.endsWith(".png") ? "image/png" : "image/jpeg",
        );
        if (!data.image) {
          throw new PlayApiError(
            "Upload succeeded but no image data returned",
            "API_EMPTY_RESPONSE",
            200,
            "This is unexpected. Retry the upload or contact Google Play support if the issue persists.",
          );
        }
        return data.image;
      },

      async delete(packageName, editId, language, imageType, imageId) {
        await http.delete(
          `/${packageName}/edits/${editId}/listings/${language}/${imageType}/${imageId}`,
        );
      },

      async deleteAll(packageName, editId, language, imageType) {
        const { data } = await http.delete<ImagesDeleteAllResponse>(
          `/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
        );
        return data.deleted || [];
      },
    },

    expansionFiles: {
      async get(packageName, editId, apkVersionCode, expansionFileType) {
        const { data } = await http.get<ExpansionFile>(
          `/${packageName}/edits/${editId}/apks/${apkVersionCode}/expansionFiles/${expansionFileType}`,
        );
        return data;
      },

      async update(packageName, editId, apkVersionCode, expansionFileType, body) {
        const { data } = await http.put<ExpansionFile>(
          `/${packageName}/edits/${editId}/apks/${apkVersionCode}/expansionFiles/${expansionFileType}`,
          body,
        );
        return data;
      },

      async patch(packageName, editId, apkVersionCode, expansionFileType, body) {
        const { data } = await http.patch<ExpansionFile>(
          `/${packageName}/edits/${editId}/apks/${apkVersionCode}/expansionFiles/${expansionFileType}`,
          body,
        );
        return data;
      },

      async upload(packageName, editId, apkVersionCode, expansionFileType, filePath) {
        const { data } = await http.upload<{ expansionFile: ExpansionFile }>(
          `/${packageName}/edits/${editId}/apks/${apkVersionCode}/expansionFiles/${expansionFileType}`,
          filePath,
          "application/octet-stream",
        );
        if (!data.expansionFile) {
          throw new PlayApiError(
            "Upload succeeded but no expansion file data returned",
            "API_EMPTY_RESPONSE",
            200,
            "This is unexpected. Retry the upload or contact Google Play support if the issue persists.",
          );
        }
        return data.expansionFile;
      },
    },

    countryAvailability: {
      async get(packageName, editId, track) {
        const { data } = await http.get<CountryAvailability>(
          `/${packageName}/edits/${editId}/countryAvailability/${track}`,
        );
        return data;
      },
    },

    dataSafety: {
      async get(packageName) {
        const { data } = await http.get<DataSafety>(`/${packageName}/dataSafety`);
        return data;
      },

      async update(packageName, body) {
        const { data } = await http.put<DataSafety>(`/${packageName}/dataSafety`, body);
        return data;
      },
    },

    reviews: {
      async list(packageName, options?) {
        const params: Record<string, string> = {};
        if (options?.token) params["token"] = options.token;
        if (options?.maxResults) params["maxResults"] = String(options.maxResults);
        if (options?.startIndex !== undefined) params["startIndex"] = String(options.startIndex);
        if (options?.translationLanguage)
          params["translationLanguage"] = options.translationLanguage;
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<ReviewsListResponse>(
          `/${packageName}/reviews`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async get(packageName, reviewId, translationLanguage?) {
        const params: Record<string, string> = {};
        if (translationLanguage) params["translationLanguage"] = translationLanguage;
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<Review>(
          `/${packageName}/reviews/${reviewId}`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async reply(packageName, reviewId, replyText) {
        const body: ReviewReplyRequest = { replyText };
        const { data } = await http.post<ReviewReplyResponse>(
          `/${packageName}/reviews/${reviewId}:reply`,
          body,
        );
        return data;
      },
    },

    subscriptions: {
      async list(packageName, options?) {
        const params: Record<string, string> = {};
        if (options?.pageToken) params["pageToken"] = options.pageToken;
        if (options?.pageSize) params["pageSize"] = String(options.pageSize);
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<SubscriptionsListResponse>(
          `/${packageName}/subscriptions`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async get(packageName, productId) {
        const { data } = await http.get<Subscription>(`/${packageName}/subscriptions/${productId}`);
        return data;
      },

      async create(packageName, body, productId?, regionsVersion?) {
        const params: Record<string, string> = {};
        if (productId) params["productId"] = productId;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        const path = `/${packageName}/subscriptions?${new URLSearchParams(params).toString()}`;
        const { data } = await http.post<Subscription>(path, body);
        return data;
      },

      async update(packageName, productId, body, updateMask?, regionsVersion?, options?) {
        const params: Record<string, string> = {};
        if (updateMask) params["updateMask"] = updateMask;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        applyMutationOptions(params, options);
        const path = `/${packageName}/subscriptions/${productId}?${new URLSearchParams(params).toString()}`;
        const { data } = await http.patch<Subscription>(path, body);
        return data;
      },

      async delete(packageName, productId) {
        await http.delete(`/${packageName}/subscriptions/${productId}`);
      },

      async batchGet(packageName, productIds) {
        const params = productIds.map((id) => `productIds=${encodeURIComponent(id)}`).join("&");
        const { data } = await http.get<SubscriptionsBatchGetResponse>(
          `/${packageName}/subscriptions:batchGet?${params}`,
        );
        return data.subscriptions ?? [];
      },

      async batchUpdate(packageName, requests) {
        const { data } = await http.post<SubscriptionsBatchUpdateResponse>(
          `/${packageName}/subscriptions:batchUpdate`,
          requests,
        );
        return data;
      },

      async activateBasePlan(packageName, productId, basePlanId) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}:activate`,
        );
        return data;
      },

      async deactivateBasePlan(packageName, productId, basePlanId) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}:deactivate`,
        );
        return data;
      },

      async deleteBasePlan(packageName, productId, basePlanId) {
        await http.delete(`/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}`);
      },

      async migratePrices(packageName, productId, basePlanId, body) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}:migratePrices`,
          body,
        );
        return data;
      },

      async batchMigratePrices(packageName, productId, body) {
        const { data } = await http.post<BatchMigratePricesResponse>(
          `/${packageName}/subscriptions/${productId}/basePlans:batchMigratePrices`,
          body,
        );
        return data;
      },

      async listOffers(packageName, productId, basePlanId) {
        const { data } = await http.get<OffersListResponse>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers`,
        );
        return data;
      },

      async getOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.get<SubscriptionOffer>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}`,
        );
        return data;
      },

      async createOffer(packageName, productId, basePlanId, body, offerId?, regionsVersion?) {
        const params: Record<string, string> = {};
        if (offerId) params["offerId"] = offerId;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        const path = `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers?${new URLSearchParams(params).toString()}`;
        const { data } = await http.post<SubscriptionOffer>(path, body);
        return data;
      },

      async updateOffer(
        packageName,
        productId,
        basePlanId,
        offerId,
        body,
        updateMask?,
        regionsVersion?,
        options?,
      ) {
        const params: Record<string, string> = {};
        if (updateMask) params["updateMask"] = updateMask;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        applyMutationOptions(params, options);
        const path = `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}?${new URLSearchParams(params).toString()}`;
        const { data } = await http.patch<SubscriptionOffer>(path, body);
        return data;
      },

      async deleteOffer(packageName, productId, basePlanId, offerId) {
        await http.delete(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}`,
        );
      },

      async activateOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.post<SubscriptionOffer>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}:activate`,
        );
        return data;
      },

      async deactivateOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.post<SubscriptionOffer>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}:deactivate`,
        );
        return data;
      },

      async batchUpdateBasePlanStates(packageName, productId, requests) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/subscriptions/${productId}/basePlans:batchUpdateStates`,
          requests,
        );
        return data;
      },

      async batchGetOffers(packageName, productId, basePlanId, offerIds) {
        const { data } = await http.post<{ subscriptionOffers: SubscriptionOffer[] }>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers:batchGet`,
          { requests: offerIds.map((id) => ({ offerId: id })) },
        );
        return data;
      },

      async batchUpdateOffers(packageName, productId, basePlanId, requests) {
        const { data } = await http.post<{ subscriptionOffers: SubscriptionOffer[] }>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers:batchUpdate`,
          requests,
        );
        return data;
      },

      async batchUpdateOfferStates(packageName, productId, basePlanId, requests) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}/offers:batchUpdateStates`,
          requests,
        );
        return data;
      },
    },

    inappproducts: {
      async list(packageName, options?) {
        // Note: maxResults and startIndex are deprecated and ignored by Google for inappproducts.list.
        // Server determines page size. Only token (pageToken) is supported for pagination.
        const params: Record<string, string> = {};
        if (options?.token) params["token"] = options.token;
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<InAppProductsListResponse>(
          `/${packageName}/inappproducts`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async get(packageName, sku) {
        const { data } = await http.get<InAppProduct>(`/${packageName}/inappproducts/${sku}`);
        return data;
      },

      async create(packageName, body, options?) {
        const params: Record<string, string> = {};
        if (options?.autoConvertMissingPrices) params["autoConvertMissingPrices"] = "true";
        const hasParams = Object.keys(params).length > 0;
        const path = hasParams
          ? `/${packageName}/inappproducts?${new URLSearchParams(params).toString()}`
          : `/${packageName}/inappproducts`;
        const { data } = await http.post<InAppProduct>(path, body);
        return data;
      },

      async update(packageName, sku, body, options?) {
        const params: Record<string, string> = {};
        if (options?.autoConvertMissingPrices) params["autoConvertMissingPrices"] = "true";
        if (options?.allowMissing) params["allowMissing"] = "true";
        const hasParams = Object.keys(params).length > 0;
        const path = hasParams
          ? `/${packageName}/inappproducts/${sku}?${new URLSearchParams(params).toString()}`
          : `/${packageName}/inappproducts/${sku}`;
        const { data } = await http.put<InAppProduct>(path, body);
        return data;
      },

      async patch(packageName, sku, body, options?) {
        const params: Record<string, string> = {};
        if (options?.autoConvertMissingPrices) params["autoConvertMissingPrices"] = "true";
        if (options?.latencyTolerance) params["latencyTolerance"] = options.latencyTolerance;
        const hasParams = Object.keys(params).length > 0;
        const path = hasParams
          ? `/${packageName}/inappproducts/${sku}?${new URLSearchParams(params).toString()}`
          : `/${packageName}/inappproducts/${sku}`;
        const { data } = await http.patch<InAppProduct>(path, body);
        return data;
      },

      async delete(packageName, sku) {
        await http.delete(`/${packageName}/inappproducts/${sku}`);
      },

      async batchUpdate(packageName, requests) {
        const { data } = await http.post<InAppProductsBatchUpdateResponse>(
          `/${packageName}/inappproducts:batchUpdate`,
          requests,
        );
        return data;
      },

      async batchGet(packageName, skus) {
        const params: Record<string, string> = {};
        if (skus.length > 0) {
          params["sku"] = skus.join(",");
        }
        const { data } = await http.get<{ inappproduct: InAppProduct[] }>(
          `/${packageName}/inappproducts:batchGet`,
          Object.keys(params).length > 0 ? params : undefined,
        );
        return data.inappproduct || [];
      },

      async batchDelete(packageName, skus) {
        await http.post(`/${packageName}/inappproducts:batchDelete`, {
          requests: skus.map((sku) => ({ packageName, sku })),
        });
      },
    },

    purchases: {
      async getProduct(packageName, productId, token) {
        const { data } = await http.get<ProductPurchase>(
          `/${packageName}/purchases/products/${productId}/tokens/${token}`,
        );
        return data;
      },

      async acknowledgeProduct(packageName, productId, token, body?) {
        await http.post(
          `/${packageName}/purchases/products/${productId}/tokens/${token}:acknowledge`,
          body,
        );
      },

      async consumeProduct(packageName, productId, token) {
        await http.post(`/${packageName}/purchases/products/${productId}/tokens/${token}:consume`);
      },

      async getSubscriptionV2(packageName, token) {
        const { data } = await http.get<SubscriptionPurchaseV2>(
          `/${packageName}/purchases/subscriptionsv2/tokens/${token}`,
        );
        return data;
      },

      async getSubscriptionV1(packageName, subscriptionId, token) {
        if (typeof process !== "undefined" && process.emitWarning) {
          process.emitWarning(
            "purchases.subscriptions.get (v1) is deprecated by Google (shutdown Aug 2027). Use getSubscriptionV2() instead.",
            "DeprecationWarning",
          );
        }
        const { data } = await http.get<SubscriptionPurchase>(
          `/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}`,
        );
        return data;
      },

      async cancelSubscription(packageName, subscriptionId, token) {
        await http.post(
          `/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}:cancel`,
        );
      },

      async deferSubscription(packageName, subscriptionId, token, body) {
        const { data } = await http.post<SubscriptionDeferResponse>(
          `/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}:defer`,
          body,
        );
        return data;
      },

      async acknowledgeSubscription(packageName, subscriptionId, token, body?) {
        await http.post(
          `/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}:acknowledge`,
          body ?? {},
        );
      },

      async revokeSubscriptionV2(packageName, token, body?) {
        await http.post(
          `/${packageName}/purchases/subscriptionsv2/tokens/${token}:revoke`,
          body ?? {},
        );
      },

      async cancelSubscriptionV2(packageName, token, body?) {
        await http.post(`/${packageName}/purchases/subscriptionsv2/tokens/${token}:cancel`, body);
      },

      async deferSubscriptionV2(packageName, token, body) {
        const { data } = await http.post<SubscriptionsV2DeferResponse>(
          `/${packageName}/purchases/subscriptionsv2/tokens/${token}:defer`,
          body,
        );
        return data;
      },

      async getProductV2(packageName, token) {
        const { data } = await http.get<ProductPurchaseV2>(
          `/${packageName}/purchases/productsv2/tokens/${token}`,
        );
        return data;
      },

      async listVoided(packageName, options?) {
        const params: Record<string, string> = {};
        if (options?.startTime) params["startTime"] = options.startTime;
        if (options?.endTime) params["endTime"] = options.endTime;
        if (options?.type !== undefined) params["type"] = String(options.type);
        if (options?.includeQuantityBasedPartialRefund)
          params["includeQuantityBasedPartialRefund"] = "true";
        if (options?.maxResults) params["maxResults"] = String(options.maxResults);
        if (options?.token) params["token"] = options.token;
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<VoidedPurchasesListResponse>(
          `/${packageName}/purchases/voidedpurchases`,
          hasParams ? params : undefined,
        );
        return data;
      },
    },

    orders: {
      async get(packageName, orderId) {
        const { data } = await http.get<Order>(`/${packageName}/orders/${orderId}`);
        return data;
      },

      async batchGet(packageName, orderIds) {
        const { data } = await http.post<BatchGetOrdersResponse>(
          `/${packageName}/orders:batchGet`,
          { orderIds },
        );
        return data.orders || [];
      },

      async refund(packageName, orderId, body?) {
        await http.post(`/${packageName}/orders/${orderId}:refund`, body);
      },
    },

    monetization: {
      async convertRegionPrices(packageName, price) {
        const { data } = await http.post<ConvertRegionPricesResponse>(
          `/${packageName}/pricing:convertRegionPrices`,
          price,
        );
        return data;
      },
    },

    reports: {
      async list(packageName, reportType, year, month) {
        const monthStr = String(month).padStart(2, "0");
        const { data } = await http.get<ReportsListResponse>(
          `/${packageName}/reports/${reportType}/${year}/${monthStr}`,
        );
        return data;
      },
    },

    testers: {
      async get(packageName, editId, track) {
        const { data } = await http.get<Testers>(
          `/${packageName}/edits/${editId}/testers/${track}`,
        );
        return data;
      },

      async update(packageName, editId, track, testersData) {
        const { data } = await http.put<Testers>(
          `/${packageName}/edits/${editId}/testers/${track}`,
          testersData,
        );
        return data;
      },

      async patch(packageName, editId, track, testersData) {
        const { data } = await http.patch<Testers>(
          `/${packageName}/edits/${editId}/testers/${track}`,
          testersData,
        );
        return data;
      },
    },

    deobfuscation: {
      async upload(packageName, editId, versionCode, filePath, fileType?) {
        const deobType = fileType || "proguard";
        const { data } = await http.upload<DeobfuscationUploadResponse>(
          `/${packageName}/edits/${editId}/apks/${versionCode}/deobfuscationFiles/${deobType}`,
          filePath,
          "application/octet-stream",
        );
        if (!data.deobfuscationFile) {
          throw new PlayApiError(
            "Upload succeeded but no deobfuscation file data returned",
            "API_EMPTY_RESPONSE",
            200,
            "This is unexpected. Retry the upload or contact Google Play support if the issue persists.",
          );
        }
        return data.deobfuscationFile;
      },
    },

    appRecovery: {
      async list(packageName, versionCode?) {
        const params: Record<string, string> = {};
        if (versionCode !== undefined) params["versionCode"] = String(versionCode);
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<AppRecoveriesListResponse>(
          `/${packageName}/appRecoveries`,
          hasParams ? params : undefined,
        );
        return data.recoveryActions || [];
      },

      async cancel(packageName, appRecoveryId) {
        await http.post(`/${packageName}/appRecovery/${appRecoveryId}:cancel`);
      },

      async deploy(packageName, appRecoveryId) {
        await http.post(`/${packageName}/appRecovery/${appRecoveryId}:deploy`);
      },

      async create(packageName, request) {
        const { data } = await http.post<AppRecoveryAction>(
          `/${packageName}/appRecoveries`,
          request,
        );
        return data;
      },

      async addTargeting(packageName, appRecoveryId, targeting) {
        const { data } = await http.post<AppRecoveryAction>(
          `/${packageName}/appRecoveries/${appRecoveryId}:addTargeting`,
          targeting,
        );
        return data;
      },
    },

    externalTransactions: {
      async create(packageName, body) {
        const { data } = await http.post<ExternalTransaction>(
          `/${packageName}/externalTransactions`,
          body,
        );
        return data;
      },

      async get(packageName, transactionId) {
        const { data } = await http.get<ExternalTransaction>(
          `/${packageName}/externalTransactions/${transactionId}`,
        );
        return data;
      },

      async refund(packageName, transactionId, refundData) {
        const { data } = await http.post<ExternalTransaction>(
          `/${packageName}/externalTransactions/${transactionId}:refund`,
          refundData,
        );
        return data;
      },
    },

    deviceTiers: {
      async list(packageName) {
        const { data } = await http.get<DeviceTierConfigsListResponse>(
          `/${packageName}/deviceTierConfigs`,
        );
        return data.deviceTierConfigs || [];
      },

      async get(packageName, configId) {
        const { data } = await http.get<DeviceTierConfig>(
          `/${packageName}/deviceTierConfigs/${configId}`,
        );
        return data;
      },

      async create(packageName, config) {
        const { data } = await http.post<DeviceTierConfig>(
          `/${packageName}/deviceTierConfigs`,
          config,
        );
        return data;
      },
    },

    oneTimeProducts: {
      async list(packageName, options?) {
        const params: Record<string, string> = {};
        if (options?.pageToken) params["pageToken"] = options.pageToken;
        if (options?.pageSize) params["pageSize"] = String(options.pageSize);
        const hasParams = Object.keys(params).length > 0;
        const { data } = await http.get<OneTimeProductsListResponse>(
          `/${packageName}/oneTimeProducts`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async get(packageName, productId) {
        const { data } = await http.get<OneTimeProduct>(
          `/${packageName}/oneTimeProducts/${productId}`,
        );
        return data;
      },

      async create(packageName, body, regionsVersion?) {
        // Official API has no POST create -- use PATCH with allowMissing=true
        const productId = body.productId;
        if (!productId) throw new Error("productId is required to create a one-time product");
        const params = new URLSearchParams({
          "regionsVersion.version": regionsVersion || DEFAULT_REGIONS_VERSION,
          allowMissing: "true",
        });
        const { data } = await http.patch<OneTimeProduct>(
          `/${packageName}/oneTimeProducts/${productId}?${params.toString()}`,
          body,
        );
        return data;
      },

      async update(packageName, productId, body, updateMask?, regionsVersion?, options?) {
        const params: Record<string, string> = {};
        if (updateMask) params["updateMask"] = updateMask;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        applyMutationOptions(params, options);
        const path = `/${packageName}/oneTimeProducts/${productId}?${new URLSearchParams(params).toString()}`;
        const { data } = await http.patch<OneTimeProduct>(path, body);
        return data;
      },

      async delete(packageName, productId) {
        await http.delete(`/${packageName}/oneTimeProducts/${productId}`);
      },

      async listOffers(packageName, productId, purchaseOptionId = "-") {
        const { data } = await http.get<OneTimeOffersListResponse>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers`,
        );
        return data;
      },

      async getOffer(packageName, productId, purchaseOptionId, offerId) {
        const { data } = await http.get<OneTimeOffer>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers/${offerId}`,
        );
        return data;
      },

      async createOffer(packageName, productId, purchaseOptionId, body, regionsVersion?) {
        const params = new URLSearchParams({
          "regionsVersion.version": regionsVersion || DEFAULT_REGIONS_VERSION,
        });
        const { data } = await http.post<OneTimeOffer>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers?${params.toString()}`,
          body,
        );
        return data;
      },

      async updateOffer(
        packageName,
        productId,
        purchaseOptionId,
        offerId,
        body,
        updateMask?,
        regionsVersion?,
        options?,
      ) {
        const params: Record<string, string> = {};
        if (updateMask) params["updateMask"] = updateMask;
        params["regionsVersion.version"] = regionsVersion || DEFAULT_REGIONS_VERSION;
        applyMutationOptions(params, options);
        const path = `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers/${offerId}?${new URLSearchParams(params).toString()}`;
        const { data } = await http.patch<OneTimeOffer>(path, body);
        return data;
      },

      async deleteOffer(packageName, productId, purchaseOptionId, offerId) {
        await http.delete(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers/${offerId}`,
        );
      },

      async batchGet(packageName, productIds) {
        const params = productIds.map((id) => `productIds=${encodeURIComponent(id)}`).join("&");
        const { data } = await http.get<{ oneTimeProducts: OneTimeProduct[] }>(
          `/${packageName}/oneTimeProducts:batchGet?${params}`,
        );
        return data.oneTimeProducts || [];
      },

      async batchUpdate(packageName, requests) {
        const { data } = await http.post<{ oneTimeProducts: OneTimeProduct[] }>(
          `/${packageName}/oneTimeProducts:batchUpdate`,
          requests,
        );
        return data;
      },

      async batchDelete(packageName, productIds) {
        await http.post(`/${packageName}/oneTimeProducts:batchDelete`, {
          requests: productIds.map((id) => ({ productId: id })),
        });
      },

      // Purchase option batch operations
      async batchDeletePurchaseOptions(packageName, productId, requests) {
        await http.post(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions:batchDelete`,
          { requests },
        );
      },

      async batchUpdatePurchaseOptionStates(packageName, productId, requests) {
        const { data } = await http.post<{ oneTimeProducts: OneTimeProduct[] }>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions:batchUpdateStates`,
          { requests },
        );
        return data;
      },

      // Offer batch operations
      async cancelOffer(packageName, productId, purchaseOptionId, offerId, latencyTolerance?) {
        const body = latencyTolerance ? { latencyTolerance } : {};
        const { data } = await http.post<OneTimeOffer>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers/${offerId}:cancel`,
          body,
        );
        return data;
      },

      async batchGetOffers(packageName, productId, purchaseOptionId, requests) {
        const { data } = await http.post<{ oneTimeProductOffers: OneTimeOffer[] }>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers:batchGet`,
          { requests },
        );
        return data;
      },

      async batchUpdateOffers(packageName, productId, purchaseOptionId, requests) {
        const { data } = await http.post<{ oneTimeProductOffers: OneTimeOffer[] }>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers:batchUpdate`,
          { requests },
        );
        return data;
      },

      async batchUpdateOfferStates(packageName, productId, purchaseOptionId, requests) {
        const { data } = await http.post<{ oneTimeProductOffers: OneTimeOffer[] }>(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers:batchUpdateStates`,
          { requests },
        );
        return data;
      },

      async batchDeleteOffers(packageName, productId, purchaseOptionId, requests) {
        await http.post(
          `/${packageName}/oneTimeProducts/${productId}/purchaseOptions/${purchaseOptionId}/offers:batchDelete`,
          { requests },
        );
      },
    },

    internalAppSharing: {
      async uploadBundle(packageName, bundlePath) {
        const { data } = await http.uploadInternal<InternalAppSharingArtifact>(
          `/${packageName}/artifacts/bundle`,
          bundlePath,
          "application/octet-stream",
        );
        return data;
      },

      async uploadApk(packageName, apkPath) {
        const { data } = await http.uploadInternal<InternalAppSharingArtifact>(
          `/${packageName}/artifacts/apk`,
          apkPath,
          "application/vnd.android.package-archive",
        );
        return data;
      },
    },

    generatedApks: {
      async list(packageName, versionCode) {
        const { data } = await http.get<GeneratedApksPerVersion>(
          `/${packageName}/generatedApks/${versionCode}`,
        );
        return data.generatedApks || [];
      },

      async download(packageName, versionCode, id) {
        return http.download(`/${packageName}/generatedApks/${versionCode}/download/${id}`);
      },
    },

    systemApks: {
      async create(packageName, versionCode, variant) {
        const { data } = await http.post<SystemApkVariant>(
          `/${packageName}/systemApks/${versionCode}/variants`,
          variant,
        );
        return data;
      },

      async list(packageName, versionCode) {
        const { data } = await http.get<{ variants: SystemApkVariant[] }>(
          `/${packageName}/systemApks/${versionCode}/variants`,
        );
        return data;
      },

      async get(packageName, versionCode, variantId) {
        const { data } = await http.get<SystemApkVariant>(
          `/${packageName}/systemApks/${versionCode}/variants/${variantId}`,
        );
        return data;
      },

      async download(packageName, versionCode, variantId) {
        return http.download(
          `/${packageName}/systemApks/${versionCode}/variants/${variantId}:download`,
        );
      },
    },
  };
}
