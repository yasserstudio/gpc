import { createHttpClient } from "./http.js";
import type { ApiClientOptions } from "./types.js";

const ENTERPRISE_BASE_URL = "https://playcustomapp.googleapis.com/playcustomapp/v1/organizations";

export interface CustomApp {
  packageName?: string;
  title: string;
  languageCode?: string;
  organizations?: Array<{ organizationId: string; organizationName?: string }>;
}

export interface CustomAppsListResponse {
  customApps?: CustomApp[];
  nextPageToken?: string;
}

export interface EnterpriseApiClient {
  apps: {
    create(organizationId: string, app: Partial<CustomApp>): Promise<CustomApp>;
    list(organizationId: string): Promise<CustomAppsListResponse>;
  };
}

export function createEnterpriseClient(options: ApiClientOptions): EnterpriseApiClient {
  const http = createHttpClient({ ...options, baseUrl: ENTERPRISE_BASE_URL });

  return {
    apps: {
      async create(organizationId, app) {
        const { data } = await http.post<CustomApp>(`/${organizationId}/apps`, app);
        return data;
      },
      async list(organizationId) {
        const { data } = await http.get<CustomAppsListResponse>(`/${organizationId}/apps`);
        return data;
      },
    },
  };
}
