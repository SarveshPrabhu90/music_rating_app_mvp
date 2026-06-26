import { Tier, type RecommendationStatus, type Track } from "@prisma/client";

import type { ApiEnvelope } from "@/lib/api/response";
import type { AlbumRankingRow, ArtistRankingRow, TrackRankingRow } from "@/lib/ranking/personal-lists";

export type TrackWithRelations = Track & {
  artist: { name: string };
  album: { title: string };
};

export type DiaryCreateRequest = {
  trackId: string;
  tier: Tier;
  note?: string;
  tags: string[];
};

export type DiaryCreateResponse = {
  entryId: string;
  score: number;
  shouldPromptPlacement: boolean;
};

export type PairwiseCreateRequest = {
  leftTrackId: string;
  rightTrackId: string;
  winnerTrackId: string;
};

export type PairwiseCreateResponse = {
  delta: number;
  kFactor: number;
  winnerConfidence: number;
  loserConfidence: number;
};

export type RankingsPatchRequest = {
  trackId: string;
  tier: Tier;
};

export type RankingsPatchResponse = {
  score: number;
};

export type RankingsDeleteResponse = {
  removed: boolean;
};

export type RankingsGetResponse = {
  rankings: Array<{
    rank: number;
    trackId: string;
    score: number;
    tier: Tier;
    confidence: number;
    comparisonCount: number;
    track: TrackWithRelations;
    lastInteractedAt: Date;
  }>;
  views: {
    topSongs: TrackRankingRow[];
    topAlbums: AlbumRankingRow[];
    topArtists: ArtistRankingRow[];
    recentlyRising: TrackRankingRow[];
    thisMonthsSound: string[];
    allTimeAnchors: TrackRankingRow[];
  };
};

export type RecommendationItem = {
  id: string;
  reason: string;
  status: RecommendationStatus;
  track: Track & {
    artist: { name: string };
    album: { title: string };
  };
};

export type RecommendationsGetResponse = {
  recommendations: RecommendationItem[];
};

export type RecommendationPatchRequest = {
  trackId: string;
  action: "save" | "dismiss";
};

export type RecommendationPatchResponse = {
  updated: true;
};

export type MobileSessionCreateRequest = {
  email: string;
  password: string;
  deviceName?: string;
};

export type MobileSessionUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  privacyDefault: string;
  subscriptionPlan: string;
};

export type MobileSessionCreateResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    subscriptionPlan?: string;
  };
};

export type MobileBootstrapResponse = {
  user: MobileSessionUser;
  features: {
    priorityRecommendations: boolean;
    weeklyRecapArchive: boolean;
    advancedInsights: boolean;
    friendsMode: boolean;
  };
  counts: {
    ratings: number;
    rankings: number;
    friends: number;
    recommendations: number;
  };
};

export type MobileDashboardResponse = {
  summary: Awaited<ReturnType<typeof import("@/lib/dashboard/summary").buildDashboardSummary>>;
  feedPreview: import("@/lib/social/feed").FeedItem[];
  counts: {
    ratings: number;
    rankings: number;
    friends: number;
  };
};

export type PublicProfileResponse = {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  privacyDefault: string;
  createdAt: string;
  friendship: {
    isFriend: boolean;
  };
  topRankings: Array<{
    id: string;
    rank: number;
    score: number;
    track: {
      id: string;
      title: string;
      artistName: string;
      albumArtUrl: string;
    };
  }>;
  recentRatings: Array<{
    id: string;
    tier: Tier;
    tierLabel: string;
    createdAt: string;
    track: {
      id: string;
      title: string;
      artistName: string;
      albumArtUrl: string;
    };
  }>;
};

export type Envelope<T> = ApiEnvelope<T>;
