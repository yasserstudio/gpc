import { createHttpClient } from "./http.js";
import type { ApiClientOptions, AppDetails, AppEdit } from "./types.js";

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
  };
}
