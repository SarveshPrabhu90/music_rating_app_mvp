import bcrypt from "bcrypt";

import { prisma } from "@/lib/db/prisma";
import {
  buildAuthAbuseKey,
  clearAuthAbuse,
  extractRequesterIp,
  readAuthAbuseState,
  registerAuthFailure,
  resolveAuthAbuseConfig,
} from "@/lib/security/auth-abuse";

type CredentialsInput = {
  email?: string | null;
  password?: string | null;
};

type RequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>;
};

function getSigninKeys(email: string, request: RequestLike) {
  const normalizedEmail = email.trim().toLowerCase();
  const ip = extractRequesterIp(request.headers ?? {});

  return {
    emailKey: buildAuthAbuseKey({ scope: "signin", dimension: "email", value: normalizedEmail }),
    ipKey: buildAuthAbuseKey({ scope: "signin", dimension: "ip", value: ip }),
  };
}

function findLockout(keys: string[]) {
  const states = keys.map((key) => readAuthAbuseState({ key }));
  return states.find((state) => !state.allowed) ?? null;
}

export async function authorizeCredentials(credentials: CredentialsInput | undefined, request: RequestLike) {
  if (!credentials?.email || !credentials.password) {
    return null;
  }

  const { email, password } = credentials;

  const config = resolveAuthAbuseConfig({
    scope: "SIGNIN",
    defaultMaxAttempts: 5,
    defaultWindowMs: 15 * 60_000,
    defaultLockoutMs: 15 * 60_000,
  });

  const { emailKey, ipKey } = getSigninKeys(email, request);
  const locked = findLockout([emailKey, ipKey]);
  if (locked) {
    throw new Error("AUTH_RATE_LIMITED");
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    registerAuthFailure({ key: emailKey, config });
    registerAuthFailure({ key: ipKey, config });
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    registerAuthFailure({ key: emailKey, config });
    registerAuthFailure({ key: ipKey, config });
    return null;
  }

  clearAuthAbuse({ key: emailKey });
  clearAuthAbuse({ key: ipKey });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    subscriptionPlan: user.subscriptionPlan,
  };
}