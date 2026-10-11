/**
 * Fixed-window, in-memory rate limiter. Best effort: it protects a single
 * server instance. Multi-instance deployments should replace it with a shared
 * store (e.g. Redis/Upstash) behind the same interface.
 */
export interface RateLimiter {
  check(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number };
}

export function createRateLimiter({ limit, windowMs, now = () => Date.now() }: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const time = now();
      // Opportunistic cleanup keeps memory bounded.
      if (hits.size > 5000) {
        for (const [k, entry] of hits) if (entry.resetAt <= time) hits.delete(k);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= time) {
        hits.set(key, { count: 1, resetAt: time + windowMs });
        return { allowed: true };
      }
      if (entry.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)) };
      }
      entry.count += 1;
      return { allowed: true };
    },
  };
}
