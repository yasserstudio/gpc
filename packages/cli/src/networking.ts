import { NetworkError } from "@gpc-cli/core";

const PROXY_ENV_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const;

/**
 * Set up proxy and custom CA certificate support.
 * Must be called before any fetch() calls.
 *
 * A configured proxy fails closed: if it cannot be applied, this throws instead
 * of letting requests (and their OAuth tokens) go out directly.
 */
export async function setupNetworking(): Promise<void> {
  // Map GPC_CA_CERT to NODE_EXTRA_CA_CERTS (works in both Node and Bun)
  const caCert = process.env["GPC_CA_CERT"];
  if (caCert && !process.env["NODE_EXTRA_CA_CERTS"]) {
    process.env["NODE_EXTRA_CA_CERTS"] = caCert;
  }

  // In standalone binary mode, Bun handles HTTPS_PROXY/HTTP_PROXY/NO_PROXY natively
  if (process.env["__GPC_BINARY"] === "1") return;

  const proxyVar = PROXY_ENV_VARS.find((name) => process.env[name]);
  if (!proxyVar) return;

  try {
    // EnvHttpProxyAgent reads HTTP(S)_PROXY and NO_PROXY itself, matching how
    // google-auth-library routes token requests.
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  } catch (error) {
    // The underlying message is not included: it can echo a proxy URL with credentials.
    const reason = error instanceof Error ? error.name : "unknown error";
    throw new NetworkError(
      `${proxyVar} is set, but GPC could not route requests through the proxy (${reason}). No requests were sent.`,
      `Check that ${proxyVar} is a valid URL such as http://proxy.example.com:8080, or reinstall GPC (npm install -g @gpc-cli/cli). Unset ${proxyVar} if you do not need a proxy.`,
    );
  }
}
