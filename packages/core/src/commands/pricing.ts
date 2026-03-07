import type { PlayApiClient, ConvertRegionPricesResponse } from "@gpc/api";

export async function convertRegionPrices(
  client: PlayApiClient,
  packageName: string,
  currencyCode: string,
  amount: string,
): Promise<ConvertRegionPricesResponse> {
  const units = amount.split(".")[0] || "0";
  const fractional = amount.split(".")[1] || "0";
  const nanos = Number(fractional.padEnd(9, "0").slice(0, 9));

  return client.monetization.convertRegionPrices(packageName, {
    price: {
      currencyCode,
      units,
      nanos,
    },
  });
}
