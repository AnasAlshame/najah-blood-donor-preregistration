interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory token bucket rate limiter for serverless execution
const ipRequests = new Map<string, RateLimitRecord>();

// Maximum 5 registrations per 10 minutes per IP address
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRequests.get(clientIp);

  if (!record || now > record.resetAt) {
    ipRequests.set(clientIp, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}
