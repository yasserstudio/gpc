/**
 * Set up proxy and custom CA certificate support.
 * Must be called before any fetch() calls.
 */
export async function setupNetworking(): Promise<void> {
  const proxyUrl = process.env["HTTPS_PROXY"] || process.env["https_proxy"] || process.env["HTTP_PROXY"] || process.env["http_proxy"];
  if (proxyUrl) {
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import("undici");
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch {
      console.error("Warning: Proxy support requires Node.js 20+. HTTPS_PROXY will be ignored.");
    }
  }

  const caCert = process.env["GPC_CA_CERT"];
  if (caCert && !process.env["NODE_EXTRA_CA_CERTS"]) {
    process.env["NODE_EXTRA_CA_CERTS"] = caCert;
  }
}
