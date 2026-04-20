import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhookHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest();

  const provided = Buffer.from(hmacHeader, "base64");

  if (computed.length !== provided.length) return false;
  return timingSafeEqual(computed, provided);
}
