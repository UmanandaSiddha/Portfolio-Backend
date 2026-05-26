import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * One-click unsubscribe token: signed HMAC of `${email}.${timestamp}`.
 * No expiry — unsubscribe links should remain valid forever.
 */
export function buildUnsubscribeToken(email: string, secret: string): string {
  const ts = Date.now().toString();
  const payload = `${email}.${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const payload = decoded.slice(0, lastDot);
    const providedSig = decoded.slice(lastDot + 1);
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const a = Buffer.from(providedSig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const [email] = payload.split(".");
    return { email };
  } catch {
    return null;
  }
}

/** Subscription confirm token — random nonce, hashed in DB. */
export function generateConfirmToken(secret: string): {
  token: string;
  hash: string;
} {
  const token = randomBytes(32).toString("base64url");
  const hash = createHmac("sha256", secret).update(token).digest("hex");
  return { token, hash };
}

export function hashConfirmToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
