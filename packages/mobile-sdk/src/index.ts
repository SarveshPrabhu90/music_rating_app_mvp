export type MobileSessionCreateRequest = {
  email: string;
  password: string;
  deviceName?: string;
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

export type RecommendationPatchRequest = {
  trackId: string;
  action: "save" | "dismiss";
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
    recentEntries: Array<unknown>;
    topRankings: Array<unknown>;
    tastePulse: {
      tags: string[];
      recommendation: unknown;
      rankingConfidencePercent: number;
      unstableCount: number;
    };
  };
  feedPreview: Array<unknown>;
  counts: {
    ratings: number;
    rankings: number;
    friends: number;
  };
};

export type MobileFriendsResponse = {
  accepted: Array<unknown>;
  incoming: Array<unknown>;
  outgoing: Array<unknown>;
};

export type MobileSearchPeopleResponse = {
  results: Array<unknown>;
};

export type MobileCatalogSearchResponse = {
  tracks: Array<unknown>;
};

export type MobileDiaryCreateResponse = {
  entryId: string;
  score: number;
  shouldPromptPlacement: boolean;
};

export type MobileRankingsResponse = {
  rankings: Array<unknown>;
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
  recommendations: Array<unknown>;
};

export type MobileRecommendationPatchResponse = {
  updated: true;
};

export type MobilePushTokenResponse = {
  registered: true;
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
      return request<{ token: string; expiresAt: string; user: { id: string; email: string; name: string } }>(
        "/api/mobile/session",
        { method: "POST", body: JSON.stringify(payload) },
        false,
      );
    },
    logout() {
      return request<{ revoked: true }>("/api/mobile/session", { method: "DELETE" });
    },
    bootstrap() {
      return request<MobileBootstrapResponse>("/api/mobile/bootstrap", { method: "GET" });
    },
    dashboard() {
      return request<MobileDashboardResponse>("/api/mobile/dashboard", { method: "GET" });
    },
    feed() {
      return request<{ items: Array<unknown> }>("/api/feed", { method: "GET" });
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
      return request<MobilePairwiseResponse>("/api/pairwise", { method: "POST", body: JSON.stringify(payload) });
    },
    recommendations() {
      return request<MobileRecommendationsResponse>("/api/recommendations", { method: "GET" });
    },
    patchRecommendation(payload: RecommendationPatchRequest) {
      return request<MobileRecommendationPatchResponse>("/api/recommendations", { method: "PATCH", body: JSON.stringify(payload) });
    },
    registerPushToken(payload: { token: string; platform: "ios" | "android" }) {
      return request<MobilePushTokenResponse>("/api/mobile/push-tokens", { method: "POST", body: JSON.stringify(payload) });
    },
  };
}