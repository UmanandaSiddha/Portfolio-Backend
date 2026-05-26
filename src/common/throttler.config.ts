import { ThrottlerModuleOptions, seconds } from "@nestjs/throttler";

/**
 * Global defaults:
 * - "short": 20 requests / 10 seconds (anti-burst)
 * - "long":  120 requests / minute   (sustained rate)
 *
 * Per-route stricter limits live on the controller via @Throttle(...).
 */
export const THROTTLER_CONFIG: ThrottlerModuleOptions = [
  { name: "short", ttl: seconds(10), limit: 20 },
  { name: "long", ttl: seconds(60), limit: 120 },
];

/**
 * Tighter quotas for auth endpoints (login/register/refresh/forgot/reset/google).
 * 10 requests / minute. Burst-style brute-force is the threat.
 */
export const AUTH_THROTTLE = { default: { limit: 10, ttl: seconds(60) } };
