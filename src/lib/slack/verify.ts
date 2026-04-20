import { createHmac, timingSafeEqual } from "crypto";

export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  // Reject requests older than 5 minutes
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const computed = "v0=" + createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex");

  const computedBuf = Buffer.from(computed);
  const signatureBuf = Buffer.from(signature);

  if (computedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(computedBuf, signatureBuf);
}
