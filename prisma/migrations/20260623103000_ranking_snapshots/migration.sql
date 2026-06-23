-- CreateTable
CREATE TABLE "UserRankingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRankingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRankingSnapshot_entityType_check" CHECK ("entityType" IN ('TRACK', 'ALBUM', 'ARTIST'))
);

-- CreateIndex
CREATE INDEX "UserRankingSnapshot_userId_entityType_capturedAt_idx" ON "UserRankingSnapshot"("userId", "entityType", "capturedAt");

-- CreateIndex
CREATE INDEX "UserRankingSnapshot_userId_entityType_itemId_capturedAt_idx" ON "UserRankingSnapshot"("userId", "entityType", "itemId", "capturedAt");
