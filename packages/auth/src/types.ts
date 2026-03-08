export interface AuthOptions {
  serviceAccountPath?: string;
  serviceAccountJson?: string;
  cachePath?: string;
}

export interface AuthClient {
  getAccessToken(): Promise<string>;
  getProjectId(): string | undefined;
  getClientEmail(): string;
}

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}
