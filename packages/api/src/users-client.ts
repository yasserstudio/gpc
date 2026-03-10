import { createHttpClient } from "./http.js";
import type { ApiClientOptions, User, UsersListResponse } from "./types.js";

const USERS_BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/developers";

export interface UsersApiClient {
  list(
    developerId: string,
    options?: { pageToken?: string; pageSize?: number },
  ): Promise<UsersListResponse>;

  get(developerId: string, userId: string): Promise<User>;

  create(developerId: string, user: Partial<User>): Promise<User>;

  update(
    developerId: string,
    userId: string,
    user: Partial<User>,
    updateMask?: string,
  ): Promise<User>;

  delete(developerId: string, userId: string): Promise<void>;
}

export function createUsersClient(options: ApiClientOptions): UsersApiClient {
  const http = createHttpClient({ ...options, baseUrl: USERS_BASE_URL });

  return {
    async list(developerId, listOptions?) {
      const params: Record<string, string> = {};
      if (listOptions?.pageToken) params["pageToken"] = listOptions.pageToken;
      if (listOptions?.pageSize) params["pageSize"] = String(listOptions.pageSize);
      const hasParams = Object.keys(params).length > 0;
      const { data } = await http.get<UsersListResponse>(
        `/${developerId}/users`,
        hasParams ? params : undefined,
      );
      return data;
    },

    async get(developerId, userId) {
      const { data } = await http.get<User>(`/${developerId}/users/${userId}`);
      return data;
    },

    async create(developerId, user) {
      const { data } = await http.post<User>(`/${developerId}/users`, user);
      return data;
    },

    async update(developerId, userId, user, updateMask?) {
      let path = `/${developerId}/users/${userId}`;
      if (updateMask) {
        path += `?updateMask=${encodeURIComponent(updateMask).replace(/%2C/gi, ",")}`;
      }
      const { data } = await http.patch<User>(path, user);
      return data;
    },

    async delete(developerId, userId) {
      await http.delete(`/${developerId}/users/${userId}`);
    },
  };
}
