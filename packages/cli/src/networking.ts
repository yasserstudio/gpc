/**
 * Set up proxy and custom CA certificate support.
 * Must be called before any fetch() calls.
 */
export async function setupNetworking(): Promise<void> {
  // Map GPC_CA_CERT to NODE_EXTRA_CA_CERTS (works in both Node and Bun)
  const caCert = process.env["GPC_CA_CERT"];
  if (caCert && !process.env["NODE_EXTRA_CA_CERTS"]) {
    process.env["NODE_EXTRA_CA_CERTS"] = caCert;
  }

  // In standalone binary mode, Bun handles HTTPS_PROXY/HTTP_PROXY natively
  if (process.env["__GPC_BINARY"] === "1") return;

  const proxyUrl =
    process.env["HTTPS_PROXY"] ||
    process.env["https_proxy"] ||
    process.env["HTTP_PROXY"] ||
    process.env["http_proxy"];
  if (proxyUrl) {
    try {
      // @ts-expect-error undici types not available in all environments
      const { ProxyAgent, setGlobalDispatcher } = await import("undici");
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch {
      console.error("Warning: Proxy support requires Node.js 20+. HTTPS_PROXY will be ignored.");
    }
  }
}
