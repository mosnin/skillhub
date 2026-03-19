// Simple in-process rate limiter using a Map
// Works for single-instance deployments; for multi-instance use Redis

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
