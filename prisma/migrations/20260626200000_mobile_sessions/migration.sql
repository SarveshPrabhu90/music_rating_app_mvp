CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MobileSession_tokenHash_key" ON "MobileSession"("tokenHash");
CREATE INDEX "MobileSession_userId_expiresAt_idx" ON "MobileSession"("userId", "expiresAt");
CREATE INDEX "MobileSession_expiresAt_revokedAt_idx" ON "MobileSession"("expiresAt", "revokedAt");