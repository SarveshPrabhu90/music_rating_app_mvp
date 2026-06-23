type AuthAttemptBucket = {
  count: number;
  windowResetAt: number;
  lockedUntil: number | null;
};

const store = new Map<string, AuthAttemptBucket>();

export type AuthAbuseConfig = {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
};

function getActiveBucket(key: string, now: number) {
  const existing = store.get(key);

  if (!existing) {
    return null;
  }

  const isLocked = existing.lockedUntil !== null && existing.lockedUntil > now;
  if (!isLocked && existing.windowResetAt <= now) {
    store.delete(key);
    return null;
  }

  return existing;
}

export function resolveAuthAbuseConfig({
  scope,
  defaultMaxAttempts,
  defaultWindowMs,
  defaultLockoutMs,
}: {
  scope: string;
  defaultMaxAttempts: number;
  defaultWindowMs: number;
  defaultLockoutMs: number;
}): AuthAbuseConfig {
  const maxAttemptsEnv = process.env[`AUTH_ABUSE_${scope}_MAX_ATTEMPTS`];
  const windowMsEnv = process.env[`AUTH_ABUSE_${scope}_WINDOW_MS`];
  const lockoutMsEnv = process.env[`AUTH_ABUSE_${scope}_LOCKOUT_MS`];

  const parsedMaxAttempts = maxAttemptsEnv ? Number(maxAttemptsEnv) : Number.NaN;
  const parsedWindowMs = windowMsEnv ? Number(windowMsEnv) : Number.NaN;
  const parsedLockoutMs = lockoutMsEnv ? Number(lockoutMsEnv) : Number.NaN;

  return {
    maxAttempts:
      Number.isFinite(parsedMaxAttempts) && parsedMaxAttempts > 0
        ? parsedMaxAttempts
        : defaultMaxAttempts,
    windowMs:
      Number.isFinite(parsedWindowMs) && parsedWindowMs > 0 ? parsedWindowMs : defaultWindowMs,
    lockoutMs:
      Number.isFinite(parsedLockoutMs) && parsedLockoutMs > 0 ? parsedLockoutMs : defaultLockoutMs,
  };
}

export function buildAuthAbuseKey({
  scope,
  dimension,
  value,
}: {
  scope: string;
  dimension: "email" | "ip";
  value: string;
}) {
  return `${scope}:${dimension}:${value.trim().toLowerCase()}`;
}

export function extractRequesterIp(headers: Headers | Record<string, string | string[] | undefined>) {
  const readHeader = (name: string) => {
    if (headers instanceof Headers) {
      return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
    }

    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const forwardedFor = readHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = readHeader("x-real-ip")?.trim();
  return forwardedFor || realIp || "anonymous";
}

export function readAuthAbuseState({
  key,
  now = Date.now(),
}: {
  key: string;
  now?: number;
}) {
  const bucket = getActiveBucket(key, now);

  if (!bucket) {
    return {
      allowed: true,
      isLocked: false,
      retryAfterSeconds: 0,
      remainingAttempts: 0,
    };
  }

  if (bucket.lockedUntil !== null && bucket.lockedUntil > now) {
    return {
      allowed: false,
      isLocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.lockedUntil - now) / 1000)),
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    isLocked: false,
    retryAfterSeconds: 0,
    remainingAttempts: bucket.count,
  };
}

export function registerAuthFailure({
  key,
  config,
  now = Date.now(),
}: {
  key: string;
  config: AuthAbuseConfig;
  now?: number;
}) {
  const activeBucket = getActiveBucket(key, now);

  if (!activeBucket) {
    const nextBucket: AuthAttemptBucket = {
      count: 1,
      windowResetAt: now + config.windowMs,
      lockedUntil: config.maxAttempts <= 1 ? now + config.lockoutMs : null,
    };
    store.set(key, nextBucket);

    return readAuthAbuseState({ key, now });
  }

  if (activeBucket.lockedUntil !== null && activeBucket.lockedUntil > now) {
    return readAuthAbuseState({ key, now });
  }

  activeBucket.count += 1;
  if (activeBucket.count >= config.maxAttempts) {
    activeBucket.lockedUntil = now + config.lockoutMs;
  }
  store.set(key, activeBucket);

  return readAuthAbuseState({ key, now });
}

export function clearAuthAbuse({ key }: { key: string }) {
  store.delete(key);
}

export function __resetAuthAbuseStore() {
  store.clear();
}