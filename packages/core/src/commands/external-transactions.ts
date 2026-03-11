import type {
  PlayApiClient,
  ExternalTransaction,
  ExternalTransactionRefund,
} from "@gpc-cli/api";

export async function createExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  data: ExternalTransaction,
): Promise<ExternalTransaction> {
  return client.externalTransactions.create(packageName, data);
}

export async function getExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  transactionId: string,
): Promise<ExternalTransaction> {
  return client.externalTransactions.get(packageName, transactionId);
}

export async function refundExternalTransaction(
  client: PlayApiClient,
  packageName: string,
  transactionId: string,
  refundData: ExternalTransactionRefund,
): Promise<ExternalTransaction> {
  return client.externalTransactions.refund(packageName, transactionId, refundData);
}
