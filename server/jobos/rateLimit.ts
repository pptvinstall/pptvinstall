// Small in-memory sliding-window limiter for Job OS endpoints (single-instance deployment).
export function createRateLimiter(opts: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
      const windowStart = now - opts.windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
      if (recent.length >= opts.max) {
        hits.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0]! + opts.windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5_000) {
        for (const [k, v] of Array.from(hits.entries())) if (!v.some((t) => t > windowStart)) hits.delete(k);
      }
      return { allowed: true };
    },
  };
}
