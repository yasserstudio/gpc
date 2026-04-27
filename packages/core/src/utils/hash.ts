import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const { size } = await stat(filePath);
  if (size === 0) return hash.digest("hex");

  const { createReadStream } = await import("node:fs");
  const stream = createReadStream(filePath);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}
