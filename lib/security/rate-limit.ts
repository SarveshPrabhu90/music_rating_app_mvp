type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

export function consumeRateLimit({
  key,
  maxRequests,
  windowMs,
  now = Date.now(),
}: {
  key: string;
  maxRequests: number;
  windowMs: number;
  now?: number;
}) {
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

export function buildRateLimitKey({
  route,
  userId,
  request,
}: {
  route: string;
  userId?: string;
  request: Request;
}) {
  if (userId) {
    return `${route}:user:${userId}`;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const requester = forwardedFor || realIp || "anonymous";
  return `${route}:ip:${requester}`;
}

export function resolveRateLimitConfig({
  scope,
  defaultMaxRequests,
  defaultWindowMs,
}: {
  scope: string;
  defaultMaxRequests: number;
  defaultWindowMs: number;
}) {
  const maxRequestsEnv = process.env[`RATE_LIMIT_${scope}_MAX_REQUESTS`];
  const windowMsEnv = process.env[`RATE_LIMIT_${scope}_WINDOW_MS`];

  const parsedMax = maxRequestsEnv ? Number(maxRequestsEnv) : Number.NaN;
  const parsedWindow = windowMsEnv ? Number(windowMsEnv) : Number.NaN;

  return {
    maxRequests: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : defaultMaxRequests,
    windowMs: Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : defaultWindowMs,
  };
}

export function __resetRateLimitStore() {
  store.clear();
}
