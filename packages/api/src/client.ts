import { createHttpClient } from "./http.js";
import type {
  ApiClientOptions,
  AppDetails,
  AppEdit,
  Bundle,
  BundleListResponse,
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
  };
}
