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

export type Envelope<T> = ApiEnvelope<T>;
