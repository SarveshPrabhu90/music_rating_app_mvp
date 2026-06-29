-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('LIFE_SONG', 'ELITE', 'HEAVY_ROTATION', 'LIKED', 'NOT_FOR_ME');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'SAVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RankingEntityType" AS ENUM ('TRACK', 'ALBUM', 'ARTIST');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PLUS', 'PRO');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "privacyDefault" TEXT NOT NULL DEFAULT 'private',
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "era" TEXT NOT NULL,
    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "era" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "albumArtUrl" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasteTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'mood',
    CONSTRAINT "TasteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "EntryTag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "UserTrackScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" "Tier" NOT NULL,
    "manualReplayCount" INTEGER NOT NULL DEFAULT 0,
    "lastInteractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTrackScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leftTrackId" TEXT NOT NULL,
    "rightTrackId" TEXT NOT NULL,
    "winnerTrackId" TEXT NOT NULL,
    "loserTrackId" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankingComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRecap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "topSongId" TEXT,
    "topMood" TEXT NOT NULL,
    "topGenre" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyRecap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRankingSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "RankingEntityType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevicePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Artist_name_key" ON "Artist"("name");
CREATE INDEX "DiaryEntry_userId_createdAt_idx" ON "DiaryEntry"("userId", "createdAt");
CREATE UNIQUE INDEX "TasteTag_name_key" ON "TasteTag"("name");
CREATE INDEX "UserTrackScore_userId_score_idx" ON "UserTrackScore"("userId", "score");
CREATE UNIQUE INDEX "UserTrackScore_userId_trackId_key" ON "UserTrackScore"("userId", "trackId");
CREATE INDEX "RankingComparison_userId_createdAt_idx" ON "RankingComparison"("userId", "createdAt");
CREATE UNIQUE INDEX "Recommendation_userId_trackId_key" ON "Recommendation"("userId", "trackId");
CREATE UNIQUE INDEX "WeeklyRecap_userId_weekStart_key" ON "WeeklyRecap"("userId", "weekStart");
CREATE INDEX "UserRankingSnapshot_userId_entityType_capturedAt_idx" ON "UserRankingSnapshot"("userId", "entityType", "capturedAt");
CREATE INDEX "UserRankingSnapshot_userId_entityType_itemId_capturedAt_idx" ON "UserRankingSnapshot"("userId", "entityType", "itemId", "capturedAt");
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");
CREATE UNIQUE INDEX "MobileSession_tokenHash_key" ON "MobileSession"("tokenHash");
CREATE INDEX "MobileSession_userId_expiresAt_idx" ON "MobileSession"("userId", "expiresAt");
CREATE INDEX "MobileSession_expiresAt_revokedAt_idx" ON "MobileSession"("expiresAt", "revokedAt");
CREATE UNIQUE INDEX "DevicePushToken_token_key" ON "DevicePushToken"("token");
CREATE INDEX "DevicePushToken_userId_platform_idx" ON "DevicePushToken"("userId", "platform");

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TasteTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTrackScore" ADD CONSTRAINT "UserTrackScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTrackScore" ADD CONSTRAINT "UserTrackScore_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankingComparison" ADD CONSTRAINT "RankingComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyRecap" ADD CONSTRAINT "WeeklyRecap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyRecap" ADD CONSTRAINT "WeeklyRecap_topSongId_fkey" FOREIGN KEY ("topSongId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRankingSnapshot" ADD CONSTRAINT "UserRankingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevicePushToken" ADD CONSTRAINT "DevicePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
