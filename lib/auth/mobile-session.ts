import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const MOBILE_SESSION_TTL_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function createMobileSession({
  userId,
  name,
}: {
  userId: string;
  name?: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MOBILE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.mobileSession.create({
    data: {
      userId,
      name,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getUserIdFromMobileSessionToken(token: string) {
  const now = new Date();
  const session = await prisma.mobileSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, userId: true },
  });

  if (!session) {
    return undefined;
  }

  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { lastUsedAt: now },
  });

  return session.userId;
}

export async function revokeMobileSessionToken(token: string) {
  const result = await prisma.mobileSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return result.count > 0;
}