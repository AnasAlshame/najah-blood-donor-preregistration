/**
 * Rate Limiting Module
 * 
 * SERVERLESS DEPLOYMENT ARCHITECTURE NOTE:
 * In a serverless environment (e.g. Vercel edge/lambda instances), memory is not shared across 
 * independent container instances. This in-memory token bucket provides burst abuse protection
 * within warm containers without introducing paid third-party dependencies (zero-budget constraint).
 * 
 * Trusted Client IP Identification:
 * On Vercel, 'x-forwarded-for' contains the client IP chain where the first entry is provided by the edge proxy.
 * To prevent client-spoofed headers, we extract the first comma-separated address or default to loopback.
 * 
 * For distributed multi-instance rate limiting under high-volume DDoS, an external store 
 * (such as Upstash Redis or Cloudflare Workers KV) is the standard evolution path.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipRequests = new Map<string, RateLimitRecord>();

// Maximum 10 registrations per 5 minutes per client IP (Generous enough for campus NAT / shared Wi-Fi)
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 10;

// Maximum size of memory map to prevent memory exhaustion
const MAX_MAP_ENTRIES = 5000;

function cleanupStaleEntries(now: number) {
  if (ipRequests.size > MAX_MAP_ENTRIES) {
    for (const [ip, record] of ipRequests.entries()) {
      if (now > record.resetAt) {
        ipRequests.delete(ip);
      }
    }
  }
}

export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanupStaleEntries(now);

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

export function resetRateLimitStore(): void {
  ipRequests.clear();
}
