import { createHttpClient } from "./http.js";
import type { RateLimiter } from "./rate-limiter.js";
import type {
  ApiClientOptions,
  AppDetails,
  AppEdit,
  BasePlanMigratePricesRequest,
  Bundle,
  BundleListResponse,
  ConvertRegionPricesRequest,
  ConvertRegionPricesResponse,
  CountryAvailability,
  DeobfuscationFile,
  DeobfuscationUploadResponse,
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
  UploadResponse,
  VoidedPurchasesListResponse,
} from "./types.js";

export interface PlayApiClient {
  edits: {
    insert(packageName: string): Promise<AppEdit>;
    get(packageName: string, editId: string): Promise<AppEdit>;
    validate(packageName: string, editId: string): Promise<AppEdit>;
    commit(packageName: string, editId: string): Promise<AppEdit>;
    delete(packageName: string, editId: string): Promise<void>;
  };

  details: {
    get(packageName: string, editId: string): Promise<AppDetails>;
    update(packageName: string, editId: string, details: Partial<AppDetails>): Promise<AppDetails>;
    patch(packageName: string, editId: string, partial: Partial<AppDetails>): Promise<AppDetails>;
  };

  bundles: {
    list(packageName: string, editId: string): Promise<Bundle[]>;
    upload(packageName: string, editId: string, filePath: string): Promise<Bundle>;
  };

  tracks: {
    list(packageName: string, editId: string): Promise<Track[]>;
    get(packageName: string, editId: string, track: string): Promise<Track>;
    update(packageName: string, editId: string, track: string, release: Release): Promise<Track>;
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

  countryAvailability: {
    get(packageName: string, editId: string, track: string): Promise<CountryAvailability>;
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
    create(packageName: string, data: Subscription): Promise<Subscription>;
    update(
      packageName: string,
      productId: string,
      data: Subscription,
      updateMask?: string,
    ): Promise<Subscription>;
    delete(packageName: string, productId: string): Promise<void>;
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
    ): Promise<SubscriptionOffer>;
    updateOffer(
      packageName: string,
      productId: string,
      basePlanId: string,
      offerId: string,
      data: SubscriptionOffer,
      updateMask?: string,
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
  };

  inappproducts: {
    list(
      packageName: string,
      options?: { token?: string; maxResults?: number },
    ): Promise<InAppProductsListResponse>;
    get(packageName: string, sku: string): Promise<InAppProduct>;
    create(packageName: string, data: InAppProduct): Promise<InAppProduct>;
    update(packageName: string, sku: string, data: InAppProduct): Promise<InAppProduct>;
    delete(packageName: string, sku: string): Promise<void>;
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
    revokeSubscriptionV2(packageName: string, token: string): Promise<void>;
    listVoided(
      packageName: string,
      options?: { startTime?: string; endTime?: string; maxResults?: number; token?: string },
    ): Promise<VoidedPurchasesListResponse>;
  };

  orders: {
    refund(
      packageName: string,
      orderId: string,
      body?: { fullRefund?: boolean; proratedRefund?: boolean },
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
  };

  deobfuscation: {
    upload(
      packageName: string,
      editId: string,
      versionCode: number,
      filePath: string,
    ): Promise<DeobfuscationFile>;
  };
}

async function rateLimit(limiter: RateLimiter | undefined, bucket: string): Promise<void> {
  if (limiter) await limiter.acquire(bucket);
}

export function createApiClient(options: ApiClientOptions): PlayApiClient {
  const http = createHttpClient(options);
  const limiter = options.rateLimiter || undefined;

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

      async commit(packageName, editId) {
        const { data } = await http.post<AppEdit>(`/${packageName}/edits/${editId}:commit`);
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

      async upload(packageName, editId, filePath) {
        const { data } = await http.upload<UploadResponse>(
          `/${packageName}/edits/${editId}/bundles`,
          filePath,
          "application/octet-stream",
        );
        if (!data.bundle) {
          throw new Error("Upload succeeded but no bundle data returned");
        }
        return data.bundle;
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

      async update(packageName, editId, track, release) {
        const { data } = await http.put<Track>(`/${packageName}/edits/${editId}/tracks/${track}`, {
          track,
          releases: [release],
        });
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

    countryAvailability: {
      async get(packageName, editId, track) {
        const { data } = await http.get<CountryAvailability>(
          `/${packageName}/edits/${editId}/countryAvailability/${track}`,
        );
        return data;
      },
    },

    reviews: {
      async list(packageName, options?) {
        await rateLimit(limiter, "reviewsGet");
        const params: Record<string, string> = {};
        if (options?.token) params["token"] = options.token;
        if (options?.maxResults) params["maxResults"] = String(options.maxResults);
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
        await rateLimit(limiter, "reviewsGet");
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
        await rateLimit(limiter, "reviewsPost");
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
          `/${packageName}/monetization/subscriptions`,
          hasParams ? params : undefined,
        );
        return data;
      },

      async get(packageName, productId) {
        const { data } = await http.get<Subscription>(
          `/${packageName}/monetization/subscriptions/${productId}`,
        );
        return data;
      },

      async create(packageName, body) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/monetization/subscriptions`,
          body,
        );
        return data;
      },

      async update(packageName, productId, body, updateMask?) {
        let path = `/${packageName}/monetization/subscriptions/${productId}`;
        if (updateMask) {
          path += `?updateMask=${encodeURIComponent(updateMask).replace(/%2C/gi, ",")}`;
        }
        const { data } = await http.patch<Subscription>(path, body);
        return data;
      },

      async delete(packageName, productId) {
        await http.delete(`/${packageName}/monetization/subscriptions/${productId}`);
      },

      async activateBasePlan(packageName, productId, basePlanId) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}:activate`,
        );
        return data;
      },

      async deactivateBasePlan(packageName, productId, basePlanId) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}:deactivate`,
        );
        return data;
      },

      async deleteBasePlan(packageName, productId, basePlanId) {
        await http.delete(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}`,
        );
      },

      async migratePrices(packageName, productId, basePlanId, body) {
        const { data } = await http.post<Subscription>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}:migratePrices`,
          body,
        );
        return data;
      },

      async listOffers(packageName, productId, basePlanId) {
        const { data } = await http.get<OffersListResponse>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers`,
        );
        return data;
      },

      async getOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.get<SubscriptionOffer>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}`,
        );
        return data;
      },

      async createOffer(packageName, productId, basePlanId, body) {
        const { data } = await http.post<SubscriptionOffer>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers`,
          body,
        );
        return data;
      },

      async updateOffer(packageName, productId, basePlanId, offerId, body, updateMask?) {
        let path = `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}`;
        if (updateMask) {
          path += `?updateMask=${encodeURIComponent(updateMask).replace(/%2C/gi, ",")}`;
        }
        const { data } = await http.patch<SubscriptionOffer>(path, body);
        return data;
      },

      async deleteOffer(packageName, productId, basePlanId, offerId) {
        await http.delete(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}`,
        );
      },

      async activateOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.post<SubscriptionOffer>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}:activate`,
        );
        return data;
      },

      async deactivateOffer(packageName, productId, basePlanId, offerId) {
        const { data } = await http.post<SubscriptionOffer>(
          `/${packageName}/monetization/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}:deactivate`,
        );
        return data;
      },
    },

    inappproducts: {
      async list(packageName, options?) {
        const params: Record<string, string> = {};
        if (options?.token) params["token"] = options.token;
        if (options?.maxResults) params["maxResults"] = String(options.maxResults);
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

      async create(packageName, body) {
        const { data } = await http.post<InAppProduct>(`/${packageName}/inappproducts`, body);
        return data;
      },

      async update(packageName, sku, body) {
        const { data } = await http.put<InAppProduct>(`/${packageName}/inappproducts/${sku}`, body);
        return data;
      },

      async delete(packageName, sku) {
        await http.delete(`/${packageName}/inappproducts/${sku}`);
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

      async revokeSubscriptionV2(packageName, token) {
        await http.post(`/${packageName}/purchases/subscriptionsv2/tokens/${token}:revoke`);
      },

      async listVoided(packageName, options?) {
        await rateLimit(limiter, "voidedBurst");
        await rateLimit(limiter, "voidedDaily");
        const params: Record<string, string> = {};
        if (options?.startTime) params["startTime"] = options.startTime;
        if (options?.endTime) params["endTime"] = options.endTime;
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
      async refund(packageName, orderId, body?) {
        await http.post(`/${packageName}/orders/${orderId}:refund`, body);
      },
    },

    monetization: {
      async convertRegionPrices(packageName, price) {
        const { data } = await http.post<ConvertRegionPricesResponse>(
          `/${packageName}/monetization/convertRegionPrices`,
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
    },

    deobfuscation: {
      async upload(packageName, editId, versionCode, filePath) {
        const { data } = await http.upload<DeobfuscationUploadResponse>(
          `/${packageName}/edits/${editId}/apks/${versionCode}/deobfuscationFiles/proguard`,
          filePath,
          "application/octet-stream",
        );
        return data.deobfuscationFile;
      },
    },
  };
}
