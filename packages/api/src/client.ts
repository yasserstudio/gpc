import { createHttpClient } from "./http.js";
import type {
  ApiClientOptions,
  AppDetails,
  AppEdit,
  Bundle,
  BundleListResponse,
  CountryAvailability,
  Image,
  ImageType,
  ImageUploadResponse,
  ImagesDeleteAllResponse,
  ImagesListResponse,
  Listing,
  ListingsListResponse,
  Release,
  Track,
  TrackListResponse,
  UploadResponse,
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
    update(packageName: string, editId: string, language: string, listing: Omit<Listing, "language">): Promise<Listing>;
    patch(packageName: string, editId: string, language: string, partial: Partial<Omit<Listing, "language">>): Promise<Listing>;
    delete(packageName: string, editId: string, language: string): Promise<void>;
    deleteAll(packageName: string, editId: string): Promise<void>;
  };

  images: {
    list(packageName: string, editId: string, language: string, imageType: ImageType): Promise<Image[]>;
    upload(packageName: string, editId: string, language: string, imageType: ImageType, filePath: string): Promise<Image>;
    delete(packageName: string, editId: string, language: string, imageType: ImageType, imageId: string): Promise<void>;
    deleteAll(packageName: string, editId: string, language: string, imageType: ImageType): Promise<Image[]>;
  };

  countryAvailability: {
    get(packageName: string, editId: string, track: string): Promise<CountryAvailability>;
  };
}

export function createApiClient(options: ApiClientOptions): PlayApiClient {
  const http = createHttpClient(options);

  return {
    edits: {
      async insert(packageName) {
        const { data } = await http.post<AppEdit>(`/${packageName}/edits`);
        return data;
      },

      async get(packageName, editId) {
        const { data } = await http.get<AppEdit>(
          `/${packageName}/edits/${editId}`,
        );
        return data;
      },

      async validate(packageName, editId) {
        const { data } = await http.post<AppEdit>(
          `/${packageName}/edits/${editId}:validate`,
        );
        return data;
      },

      async commit(packageName, editId) {
        const { data } = await http.post<AppEdit>(
          `/${packageName}/edits/${editId}:commit`,
        );
        return data;
      },

      async delete(packageName, editId) {
        await http.delete(`/${packageName}/edits/${editId}`);
      },
    },

    details: {
      async get(packageName, editId) {
        const { data } = await http.get<AppDetails>(
          `/${packageName}/edits/${editId}/details`,
        );
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
        return data.bundle!;
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
        const { data } = await http.get<Track>(
          `/${packageName}/edits/${editId}/tracks/${track}`,
        );
        return data;
      },

      async update(packageName, editId, track, release) {
        const { data } = await http.put<Track>(
          `/${packageName}/edits/${editId}/tracks/${track}`,
          { track, releases: [release] },
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
  };
}
