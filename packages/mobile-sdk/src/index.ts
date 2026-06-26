export type MobileSessionCreateRequest = {
  email: string;
  password: string;
  deviceName?: string;
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

export type DiaryCreateRequest = {
  trackId: string;
  tier: "LIFE_SONG" | "ELITE" | "HEAVY_ROTATION" | "LIKED" | "NOT_FOR_ME";
  note?: string;
  tags: string[];
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

export type RecommendationPatchRequest = {
  trackId: string;
  action: "save" | "dismiss";
};

export type RankingsPatchResponse = {
  score: number;
};

export type RankingsDeleteResponse = {
  removed: boolean;
};

export type RecommendationsGetResponse = {
  recommendations: Array<{
    id: string;
    reason: string;
    track: {
      id: string;
      title: string;
      artist: { name: string };
    };
  }>;
};

export type RecommendationPatchResponse = {
  updated: true;
};

export type MobileBootstrapResponse = {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    privacyDefault: string;
    subscriptionPlan?: string;
  };
  features: Record<string, boolean | number>;
  counts: {
    ratings: number;
    rankings: number;
    friends: number;
    recommendations: number;
  };
};

export type MobileDashboardResponse = {
  summary: {
    recentEntries: Array<{
      id: string;
      createdAt: string;
      tier: DiaryCreateRequest["tier"];
      tierLabel: string;
      note?: string | null;
      tags: string[];
      track: {
        id: string;
        title: string;
        artistName: string;
        albumArtUrl: string;
      };
    }>;
    topRankings: Array<{
      id: string;
      rank: number;
      trackId: string;
      score: number;
      comparisonCount: number;
      confidence: number;
      track: {
        id: string;
        title: string;
        artistName: string;
        albumArtUrl: string;
      };
    }>;
    tastePulse: {
      tags: string[];
      recommendation: {
        id: string;
        score: number;
        reason: string;
        track: {
          id: string;
          title: string;
          artistName: string;
          albumArtUrl: string;
        };
      } | null;
      rankingConfidencePercent: number;
      unstableCount: number;
    };
  };
  feedPreview: Array<{
    id: string;
    type: "rating" | "comparison";
    createdAt: string;
    text: string;
    meta: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
    track: {
      id: string;
      title: string;
      artistName: string;
    };
  }>;
  counts: {
    ratings: number;
    rankings: number;
    friends: number;
  };
};

export type MobileFriendsResponse = {
  accepted: Array<{ id: string; user: { id: string; name: string; username: string; bio: string | null } }>;
  incoming: Array<{ id: string; user: { id: string; name: string; username: string; bio: string | null } }>;
  outgoing: Array<{ id: string; user: { id: string; name: string; username: string; bio: string | null } }>;
};

export type MobileSearchPeopleResponse = {
  results: Array<{
    id: string;
    username: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    privacyDefault: string;
    relationship: "none" | "friends" | "incoming" | "outgoing";
    friendshipId: string | null;
  }>;
};

export type MobileCatalogSearchResponse = {
  tracks: Array<{
    id: string;
    title: string;
    genre: string;
    artist: { name: string };
    album: { title: string };
  }>;
};

export type MobileDiaryCreateResponse = {
  entryId: string;
  score: number;
  shouldPromptPlacement: boolean;
};

export type MobileRankingsResponse = {
  rankings: Array<{
    rank: number;
    trackId: string;
    score: number;
    tier: DiaryCreateRequest["tier"];
    confidence: number;
    comparisonCount: number;
    track: {
      id: string;
      title: string;
      albumArtUrl: string;
      artist: { name: string };
      album: { title: string };
    };
  }>;
};

export type MobileRankingPatchResponse = {
  score: number;
};

export type MobileDeleteResponse = {
  removed: boolean;
};

export type MobilePairwiseResponse = {
  delta: number;
  kFactor: number;
  winnerConfidence: number;
  loserConfidence: number;
};

export type MobileRecommendationsResponse = {
  recommendations: Array<{
    id: string;
    reason: string;
    track: {
      id: string;
      title: string;
      artist: { name: string };
    };
  }>;
};

export type MobileFeedResponse = {
  items: Array<{
    id: string;
    type: "rating" | "comparison";
    createdAt: string;
    text: string;
    meta: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
    track: {
      id: string;
      title: string;
      artistName: string;
    };
  }>;
};

export type MobileRecommendationPatchResponse = {
  updated: true;
};

export type MobilePushTokenResponse = {
  registered: true;
};

export type MobileSessionGetResponse = {
  user: MobileBootstrapResponse["user"] | null;
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
    tier: DiaryCreateRequest["tier"];
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

type Envelope<T> =
  | { ok: true; data: T; meta?: { requestId?: string } }
  | { ok: false; error: { code: string; message: string; details?: unknown }; meta?: { requestId?: string } };

export class MobileSdkError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function createMobileSdk({
  baseUrl,
  getToken,
}: {
  baseUrl: string;
  getToken?: () => Promise<string | null> | string | null;
}) {
  async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
    const token = auth && getToken ? await getToken() : null;
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json()) as Envelope<T>;

    if (!response.ok || !body.ok) {
      throw new MobileSdkError(
        response.status,
        body.ok ? "HTTP_ERROR" : body.error.code,
        body.meta?.requestId,
        body.ok ? `HTTP ${response.status}` : body.error.message,
      );
    }

    return body.data;
  }

  return {
    login(payload: MobileSessionCreateRequest) {
      return request<MobileSessionCreateResponse>(
        "/api/mobile/session",
        { method: "POST", body: JSON.stringify(payload) },
        false,
      );
    },
    logout() {
      return request<{ revoked: true }>("/api/mobile/session", { method: "DELETE" });
    },
    session() {
      return request<MobileSessionGetResponse>("/api/mobile/session", { method: "GET" });
    },
    bootstrap() {
      return request<MobileBootstrapResponse>("/api/mobile/bootstrap", { method: "GET" });
    },
    dashboard() {
      return request<MobileDashboardResponse>("/api/mobile/dashboard", { method: "GET" });
    },
    feed() {
      return request<MobileFeedResponse>("/api/feed", { method: "GET" });
    },
    friends() {
      return request<MobileFriendsResponse>("/api/friends", { method: "GET" });
    },
    searchPeople(query: string) {
      return request<MobileSearchPeopleResponse>(`/api/people/search?q=${encodeURIComponent(query)}`, { method: "GET" });
    },
    searchCatalog(query: string) {
      return request<MobileCatalogSearchResponse>(`/api/catalog/search?q=${encodeURIComponent(query)}`, { method: "GET" });
    },
    createDiaryEntry(payload: DiaryCreateRequest) {
      return request<MobileDiaryCreateResponse>("/api/diary", { method: "POST", body: JSON.stringify(payload) });
    },
    rankings() {
      return request<MobileRankingsResponse>("/api/rankings", { method: "GET" });
    },
    patchRanking(trackId: string, tier: DiaryCreateRequest["tier"]) {
      return request<MobileRankingPatchResponse>("/api/rankings", { method: "PATCH", body: JSON.stringify({ trackId, tier }) });
    },
    deleteRanking(trackId: string) {
      return request<MobileDeleteResponse>(`/api/rankings?trackId=${encodeURIComponent(trackId)}`, { method: "DELETE" });
    },
    createPairwise(payload: PairwiseCreateRequest) {
      return request<PairwiseCreateResponse>("/api/pairwise", { method: "POST", body: JSON.stringify(payload) });
    },
    recommendations() {
      return request<RecommendationsGetResponse>("/api/recommendations", { method: "GET" });
    },
    patchRecommendation(payload: RecommendationPatchRequest) {
      return request<RecommendationPatchResponse>("/api/recommendations", { method: "PATCH", body: JSON.stringify(payload) });
    },
    registerPushToken(payload: { token: string; platform: "ios" | "android" }) {
      return request<MobilePushTokenResponse>("/api/mobile/push-tokens", { method: "POST", body: JSON.stringify(payload) });
    },
    removePushToken(token: string) {
      return request<{ removed: true }>("/api/mobile/push-tokens", { method: "DELETE", body: JSON.stringify({ token }) });
    },
    publicProfile(username: string) {
      return request<PublicProfileResponse>(`/api/profile/${encodeURIComponent(username)}`, { method: "GET" });
    },
  };
}