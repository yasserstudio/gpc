import { NetworkError } from "@gpc-cli/core";

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

  // Resolve once and pass explicitly. undici falls back with `??`, so an empty
  // lowercase var (e.g. `https_proxy=` in a container) would otherwise hide a
  // set uppercase one and send traffic direct.
  const httpsProxy = process.env["https_proxy"] || process.env["HTTPS_PROXY"];
  const httpProxy = process.env["http_proxy"] || process.env["HTTP_PROXY"];
  if (!httpsProxy && !httpProxy) return;

  try {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
    // EnvHttpProxyAgent adds NO_PROXY support; it warns once that it is
    // experimental, which would pollute every proxied run (including --json).
    const emitWarning = process.emitWarning;
    process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
      if ((rest[0] as { code?: string } | undefined)?.code === "UNDICI-EHPA") return;
      (emitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
    }) as typeof process.emitWarning;
    try {
      setGlobalDispatcher(
        new EnvHttpProxyAgent({
          ...(httpProxy ? { httpProxy } : {}),
          ...(httpsProxy ? { httpsProxy } : {}),
        }),
      );
    } finally {
      process.emitWarning = emitWarning;
    }
  } catch (error) {
    // The underlying message is not included: it can echo a proxy URL with credentials.
    const reason = error instanceof Error ? error.name : "unknown error";
    throw new NetworkError(
      `A proxy is configured (HTTPS_PROXY / HTTP_PROXY), but GPC could not route requests through it (${reason}). No requests were sent.`,
      "Check that HTTPS_PROXY and HTTP_PROXY (or their lowercase forms) are valid URLs such as http://proxy.example.com:8080, or reinstall GPC (npm install -g @gpc-cli/cli). Unset them if you do not need a proxy.",
    );
  }
}
